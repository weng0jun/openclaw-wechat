/**
 * WeChat Homework Submitter v1.0
 * 功能：通过微信向指定群/联系人提交视频作业
 * 基于：wechat-greeter.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// --- Configuration ---
const WORKSPACE = path.join(process.env.HOME, '.openclaw/workspace');
const SUBMIT_LOG_FILE = path.join(WORKSPACE, 'homework_submit_log.json');
const LOG_FILE = path.join(WORKSPACE, 'homework_submit.txt');

const DEFAULT_CONFIG = {
  options: {
    preventDuplicate: true,
    retryOnFailure: 3,
    uploadTimeout: 300000,  // 5 minutes
    delayBetweenTargets: 5000
  }
};

const DRY_RUN = process.argv.includes('--dry-run');

// State
let SUBMIT_HISTORY = [];

// --- Logging ---
function log(msg) {
    const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const logLine = `[${timestamp}] [📹 HomeworkSubmitter] ${msg}`;
    console.log(logLine);
    try {
        if (!fs.existsSync(WORKSPACE)) {
            fs.mkdirSync(WORKSPACE, { recursive: true });
        }
        fs.appendFileSync(LOG_FILE, logLine + '\n');
    } catch(e) {}
}

// --- Persistence ---
function loadSubmitHistory() {
    try {
        if (fs.existsSync(SUBMIT_LOG_FILE)) {
            SUBMIT_HISTORY = JSON.parse(fs.readFileSync(SUBMIT_LOG_FILE, 'utf8'));
            log(`📖 Loaded ${SUBMIT_HISTORY.length} submit records.`);
        }
    } catch (e) {
        log(`⚠️ Failed to load history: ${e.message}`);
        SUBMIT_HISTORY = [];
    }
}

function saveSubmitRecord(record) {
    SUBMIT_HISTORY.push(record);
    try {
        if (!DRY_RUN) {
            fs.writeFileSync(SUBMIT_LOG_FILE, JSON.stringify(SUBMIT_HISTORY, null, 2));
            log(`✅ Saved submit record: ${record.targetId}`);
        }
    } catch(e) {
        log(`❌ Failed to save record: ${e.message}`);
    }
}

function checkAlreadySubmitted(targetId, videoPath) {
    return SUBMIT_HISTORY.some(record =>
        record.targetId === targetId &&
        record.videoPath === videoPath &&
        record.status === 'success'
    );
}

// --- Helpers ---
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function randomSleep(min, max) {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    return sleep(ms);
}

function ensureWeChatFocus() {
    try {
        execSync('open -a WeChat');
        const script = `
        tell application "System Events" to tell process "WeChat"
            set frontmost to true
            set position of window 1 to {0, 0}
            set size of window 1 to {1200, 900}
        end tell
        `;
        execSync(`osascript -e '${script}'`);
        return sleep(1000);
    } catch (e) {
        log(`⚠️ Focus WeChat failed: ${e.message}`);
    }
}

// --- OCR Helper ---
function getScreenText(imgPath) {
    const swiftScript = `
import Vision
import AppKit
let url = URL(fileURLWithPath: "${imgPath}")
if let image = NSImage(contentsOf: url), let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) {
    let request = VNRecognizeTextRequest { (request, error) in
        guard let observations = request.results as? [VNRecognizedTextObservation] else { return }
        for observation in observations {
            let text = observation.topCandidates(1).first?.string ?? ""
            let box = observation.boundingBox
            let y = 1 - (box.origin.y + box.size.height/2)
            let x = box.origin.x + box.size.width/2
            print("\\(text)|\\(x),\\(y)")
        }
    }
    request.recognitionLanguages = ["zh-Hans", "en-US"]
    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    try? handler.perform([request])
}
    `;
    try {
        return execSync(`swift -e '${swiftScript}'`).toString();
    } catch (e) {
        log(`❌ OCR failed: ${e.message}`);
        return "";
    }
}

function findTextOnScreen(targetText, imgPath = null) {
    const screenshotPath = imgPath || `/tmp/wechat_screen_${Date.now()}.png`;
    if (!imgPath) {
        execSync(`screencapture -x "${screenshotPath}"`);
    }

    const ocrResult = getScreenText(screenshotPath);
    const lines = ocrResult.split('\n').filter(l => l.trim());

    for (const line of lines) {
        const parts = line.split('|');
        if (parts.length < 2) continue;

        const text = parts[0].trim();
        const coords = parts[1];

        if (text.includes(targetText) || targetText.includes(text)) {
            const [nx, ny] = coords.split(',').map(Number);
            const W = 1920; const H = 1080;  // 假设分辨率，实际应动态获取
            return {
                text: text,
                x: Math.round(nx * W),
                y: Math.round(ny * H)
            };
        }
    }
    return null;
}

// --- Phase 2: Search Functions ---
async function clickSearchBox() {
    log("🔍 Looking for search box...");
    await ensureWeChatFocus();

    // 方法1: 尝试快捷键 Cmd+F（微信搜索快捷键）
    try {
        const script = `
        tell application "System Events" to tell process "WeChat"
            keystroke "f" using command down
        end tell
        `;
        execSync(`osascript -e '${script}'`);
        await sleep(1000);
        log("✅ Triggered search via Cmd+F");
        return true;
    } catch (e) {
        log(`⚠️ Cmd+F failed: ${e.message}`);
    }

    // 方法2: OCR 查找搜索框
    const searchBox = findTextOnScreen("搜索");
    if (searchBox) {
        log(`✅ Found search box at (${searchBox.x}, ${searchBox.y})`);
        try {
            execSync(`peekaboo click --coords ${searchBox.x},${searchBox.y}`);
            await sleep(1000);
            return true;
        } catch (e) {
            log(`❌ Click search box failed: ${e.message}`);
        }
    }

    return false;
}

async function typeSearchKeyword(keyword) {
    log(`⌨️ Typing keyword: "${keyword}"`);
    const escapedKeyword = keyword.replace(/"/g, '\\"').replace(/`/g, '\\`');
    const script = `
    set the clipboard to "${escapedKeyword}"
    tell application "System Events" to tell process "WeChat"
        set frontmost to true
        keystroke "a" using command down
        delay 0.2
        keystroke "v" using command down
        delay 0.5
    end tell
    `;
    try {
        execSync(`osascript -e '${script}'`);
        await sleep(1500);  // 等待搜索结���
        log("✅ Keyword typed (via clipboard)");
        return true;
    } catch (e) {
        log(`❌ Type keyword failed: ${e.message}`);
        return false;
    }
}

async function selectSearchResult(targetName) {
    log(`🎯 Selecting search result: "${targetName}"`);

    // 截图并 OCR 识别搜索结果
    const screenshotPath = `/tmp/wechat_search_result.png`;
    execSync(`screencapture -x "${screenshotPath}"`);

    const ocrResult = getScreenText(screenshotPath);
    const lines = ocrResult.split('\n').filter(l => l.trim());

    // 查找匹配的结果（模糊匹配）
    for (const line of lines) {
        const parts = line.split('|');
        if (parts.length < 2) continue;

        const text = parts[0].trim();
        const coords = parts[1];

        // 模糊匹配目标名称
        if (text.includes(targetName) || targetName.includes(text)) {
            const [nx, ny] = coords.split(',').map(Number);
            const W = 1920; const H = 1080;
            const x = Math.round(nx * W);
            const y = Math.round(ny * H);

            log(`✅ Found match: "${text}" at (${x}, ${y})`);
            try {
                execSync(`peekaboo click --coords ${x},${y}`);
                await sleep(2000);  // 等待聊天窗口打开
                return true;
            } catch (e) {
                log(`❌ Click result failed: ${e.message}`);
            }
        }
    }

    // 如果没找到，尝试按回车选择第一个结果
    log("⚠️ No exact match found, trying Enter key...");
    try {
        const script = `
        tell application "System Events" to tell process "WeChat"
            key code 36
        end tell
        `;
        execSync(`osascript -e '${script}'`);
        await sleep(2000);
        return true;
    } catch (e) {
        log(`❌ Enter key failed: ${e.message}`);
        return false;
    }
}

async function searchAndOpenChat(target) {
    log(`--- Searching for: ${target.name} ---`);

    // 1. 点击搜索框
    const searchBoxOpened = await clickSearchBox();
    if (!searchBoxOpened) {
        log("❌ Failed to open search box");
        return false;
    }

    // 2. 输入关键词
    const keyword = target.searchKeyword || target.name;
    const typed = await typeSearchKeyword(keyword);
    if (!typed) {
        log("❌ Failed to type keyword");
        return false;
    }

    // 3. 选择结果
    const selected = await selectSearchResult(target.name);
    if (!selected) {
        log("❌ Failed to select search result");
        return false;
    }

    log("✅ Chat opened successfully");
    return true;
}

// --- Phase 3: Video Send Functions ---
async function sendVideoFile(videoPath) {
    log(`📹 Sending video: ${videoPath}`);

    // 检查文件是否存在
    if (!fs.existsSync(videoPath)) {
        log(`❌ Video file not found: ${videoPath}`);
        return false;
    }

    const fileStats = fs.statSync(videoPath);
    const fileSizeMB = (fileStats.size / 1024 / 1024).toFixed(2);
    log(`📊 File size: ${fileSizeMB} MB`);

    try {
        // 使用 Finder 原生复制 + 微信粘贴（已验证有效）
        log("🎯 Step 1: Open file in Finder...");
        execSync(`open -R "${videoPath}"`);
        await sleep(1000);

        log("🎯 Step 2: Copy file in Finder...");
        const copyInFinderScript = `
        tell application "Finder"
            activate
            delay 0.5
        end tell

        tell application "System Events"
            tell process "Finder"
                keystroke "c" using command down
                delay 0.5
            end tell
        end tell
        `;
        execSync(`osascript -e '${copyInFinderScript}'`);
        await sleep(800);

        log("🎯 Step 3: Switch to WeChat...");
        execSync(`open -a WeChat`);
        await sleep(1000);

        log("🎯 Step 4: Paste file in WeChat...");
        const pasteScript = `
        tell application "System Events"
            tell process "WeChat"
                set frontmost to true
                delay 0.5

                keystroke "v" using command down
                delay 0.5
            end tell
        end tell
        `;
        execSync(`osascript -e '${pasteScript}'`);
        await sleep(2000);

        log("🎯 Step 5: Close Finder window...");
        try {
            execSync(`osascript -e 'tell application "Finder" to close every window'`);
        } catch(e) {}

        log("✅ Video file pasted successfully");
        return true;

    } catch (e) {
        log(`❌ Send video failed: ${e.message}`);
        return false;
    }
}

async function sendCaption(caption) {
    if (!caption || caption.trim() === '') {
        return true;
    }

    log(`💬 Adding caption: "${caption.substring(0, 30)}..."`);

    const escapedCaption = caption.replace(/"/g, '\\"').replace(/`/g, '\\`');
    const script = `
    set the clipboard to "${escapedCaption}"
    tell application "System Events" to tell process "WeChat"
        set frontmost to true
        keystroke "v" using command down
    end tell
    `;

    try {
        execSync(`osascript -e '${script}'`);
        await sleep(1000);
        log("✅ Caption added");
        return true;
    } catch (e) {
        log(`❌ Add caption failed: ${e.message}`);
        return false;
    }
}

async function clickSendButton() {
    log("🚀 Clicking send button...");

    // 查找"发送"按钮
    const sendBtn = findTextOnScreen("发送");
    if (sendBtn) {
        try {
            execSync(`peekaboo click --coords ${sendBtn.x},${sendBtn.y}`);
            await sleep(1000);
            log("✅ Send button clicked");
            return true;
        } catch (e) {
            log(`⚠️ Click send button failed: ${e.message}`);
        }
    }

    // 备选方案：按回车
    log("🎯 Trying Enter key...");
    try {
        const script = `
        tell application "System Events" to tell process "WeChat"
            key code 36
        end tell
        `;
        execSync(`osascript -e '${script}'`);
        await sleep(1000);
        log("✅ Enter key pressed");
        return true;
    } catch (e) {
        log(`❌ Enter key failed: ${e.message}`);
        return false;
    }
}

// --- Phase 4: Verification ---
async function verifySendSuccess(uploadTimeout) {
    log("🔍 Verifying send success...");

    const startTime = Date.now();
    const maxWaitTime = uploadTimeout || 300000;  // 默认5分钟

    while (Date.now() - startTime < maxWaitTime) {
        await sleep(3000);

        // 截图检查
        const screenshotPath = `/tmp/wechat_verify_${Date.now()}.png`;
        execSync(`screencapture -x "${screenshotPath}"`);

        const text = getScreenText(screenshotPath);
        const lowerText = text.toLowerCase();

        // 检查失败标志
        if (lowerText.includes("发送失败") || lowerText.includes("failed")) {
            log("❌ Send failed detected");
            return false;
        }

        // 检查成功标志（视频缩略图、文件大小等）
        // 简化版：等待上传进度消失
        if (!lowerText.includes("上传中") && !lowerText.includes("uploading")) {
            log("✅ Upload completed");
            return true;
        }

        log(`⏳ Still uploading... ${Math.round((Date.now() - startTime) / 1000)}s`);
    }

    log("⏰ Upload timeout");
    return false;
}

// --- Main Logic ---
async function submitHomework(config) {
    log("🚀 Starting Homework Submitter v1.0...");
    if (DRY_RUN) log("🚧 DRY RUN MODE");

    loadSubmitHistory();
    await ensureWeChatFocus();

    const submissions = config.submissions || [];
    const targets = config.targets || [];
    const options = { ...DEFAULT_CONFIG.options, ...config.options };

    log(`📋 Found ${submissions.length} submissions, ${targets.length} targets`);

    for (const submission of submissions) {
        const { videoPath, caption, targetIds } = submission;

        // 检查视频文件
        if (!fs.existsSync(videoPath)) {
            log(`❌ Video not found: ${videoPath}`);
            continue;
        }

        for (const targetId of targetIds) {
            const target = targets.find(t => t.id === targetId);
            if (!target) {
                log(`❌ Target not found: ${targetId}`);
                continue;
            }

            if (!target.enabled) {
                log(`⏩ Target disabled: ${target.name}`);
                continue;
            }

            log(`\n========== Processing: ${target.name} ==========`);

            // 检查是否已提交
            if (options.preventDuplicate && checkAlreadySubmitted(targetId, videoPath)) {
                log(`⚠️ Already submitted to ${target.name}, skipping...`);
                continue;
            }

            let success = false;
            let retryCount = 0;

            while (!success && retryCount < options.retryOnFailure) {
                if (retryCount > 0) {
                    log(`🔄 Retry ${retryCount}/${options.retryOnFailure}...`);
                    await sleep(5000);
                }

                try {
                    // Step 1: 搜索并打开聊天
                    const chatOpened = await searchAndOpenChat(target);
                    if (!chatOpened) {
                        retryCount++;
                        continue;
                    }

                    if (DRY_RUN) {
                        log("🚧 DRY RUN: Would send video and caption");
                        success = true;
                        break;
                    }

                    // Step 2: 发送视频文件
                    const videoSent = await sendVideoFile(videoPath);
                    if (!videoSent) {
                        retryCount++;
                        continue;
                    }

                    // Step 3: 添加文字说明
                    if (caption) {
                        await sendCaption(caption);
                        await sleep(1000);
                    }

                    // Step 4: 点击发送
                    const sendClicked = await clickSendButton();
                    if (!sendClicked) {
                        retryCount++;
                        continue;
                    }

                    // Step 5: 验证发送成功
                    const verified = await verifySendSuccess(options.uploadTimeout);
                    if (!verified) {
                        retryCount++;
                        continue;
                    }

                    success = true;

                } catch (error) {
                    log(`❌ Error: ${error.message}`);
                    retryCount++;
                }
            }

            // 记录结果
            const record = {
                targetId: targetId,
                targetName: target.name,
                videoPath: videoPath,
                caption: caption,
                status: success ? 'success' : 'failed',
                timestamp: new Date().toISOString(),
                retryCount: retryCount
            };

            saveSubmitRecord(record);

            if (success) {
                log(`✅ Successfully submitted to ${target.name}`);
            } else {
                log(`❌ Failed to submit to ${target.name} after ${retryCount} retries`);
            }

            // 延迟后处理下一个目标
            if (targetIds.indexOf(targetId) < targetIds.length - 1) {
                log(`⏳ Waiting ${options.delayBetweenTargets}ms before next target...`);
                await sleep(options.delayBetweenTargets);
            }
        }
    }

    log("\n🎉 All submissions completed!");
    log(`📊 Summary: ${SUBMIT_HISTORY.filter(r => r.status === 'success').length} success, ${SUBMIT_HISTORY.filter(r => r.status === 'failed').length} failed`);
}

// --- Entry Point ---
async function main() {
    try {
        // 解析配置文件路径
        const configPathArg = process.argv.find(arg => arg.startsWith('--config='));
        const configPath = configPathArg
            ? configPathArg.split('=')[1]
            : path.join(__dirname, 'homework-config.json');

        if (!fs.existsSync(configPath)) {
            console.error(`❌ Config file not found: ${configPath}`);
            console.error(`Usage: node homework-submitter.js --config=homework-config.json [--dry-run]`);
            process.exit(1);
        }

        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        await submitHomework(config);

    } catch (error) {
        log(`💥 Fatal error: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

main();
