// background.js

const FILE_DOWNLOAD_BASE_URL = 'https://portal.it-chiba.ac.jp/uprx/filedownload';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchFileDirectly') {
        const { fileId, fileName } = request;
        
        // HARファイルで特定されたURL構造を使用
        // fileId と fileName をURLエンコードして使用
        const url = `${FILE_DOWNLOAD_BASE_URL}?fileId=${fileId}&fileName=${encodeURIComponent(fileName)}&kbn=9`;
        
        // 認証クッキーを含めてGETリクエストを実行 (認証情報必須)
        fetch(url, { credentials: 'include' })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`File download failed: ${response.status}`);
                }
                
                // Content-Typeヘッダーを取得
                const mimeType = response.headers.get('Content-Type') || (fileName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
                
                return response.blob().then(blob => ({ blob, mimeType }));
            })
            .then(({ blob, mimeType }) => {
                // Blob (生のファイルデータ)をData URLに変換してContent Scriptへ返す
                const reader = new FileReader();
                reader.onloadend = () => sendResponse({ dataUrl: reader.result, mimeType });
                reader.readAsDataURL(blob);
                return true; 
            })
            .catch(error => {
                console.error('Download process failed:', error);
                sendResponse({ error: error.message });
            });
            
        return true; 
    }
});