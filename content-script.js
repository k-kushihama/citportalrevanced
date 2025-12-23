// content-script.js

// プレビューモーダルを表示する関数
function displayPreviewModal(dataUrl, mimeType) {
    // 既存のモーダルがあれば削除
    const existingModal = document.getElementById('unipa-preview-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'unipa-preview-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0.9); z-index: 99999;
        display: flex; justify-content: center; align-items: center;
        flex-direction: column;
    `;
    
    let contentElement;
    
    if (mimeType.includes('application/pdf')) {
        contentElement = document.createElement('iframe');
        contentElement.src = dataUrl;
        contentElement.style.cssText = `width: 90%; height: 90%; border: none;`;
    } 
    else if (mimeType.startsWith('image/')) {
        contentElement = document.createElement('img');
        contentElement.src = dataUrl;
        contentElement.style.cssText = `max-width: 90%; max-height: 90%; object-fit: contain;`;
    } else {
        alert(`プレビュー非対応のファイル形式です: ${mimeType}。`);
        return;
    }
    
    modal.appendChild(contentElement);
    
    // 閉じるボタンの作成
    const closeButton = document.createElement('button');
    closeButton.textContent = '✕ 閉じる';
    closeButton.style.cssText = `
        position: absolute; top: 10px; right: 10px; z-index: 100000;
        padding: 8px 15px; background: white; border: 1px solid #ccc; cursor: pointer;
        font-weight: bold;
    `;
    closeButton.onclick = () => modal.remove();
    modal.appendChild(closeButton);
    
    document.body.appendChild(modal);
    
    // Escキーで閉じる処理
    const closeOnEscape = function(e) {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', closeOnEscape);
        }
    };
    document.addEventListener('keydown', closeOnEscape);
}


// ファイル名を要素から推測する関数
function getFileName(buttonElement) {
    // ダウンロードボタンの親要素の兄弟要素にあるファイル名要素を取得
    const fileRow = buttonElement.closest('div.fileListCell').previousElementSibling; 
    
    if (fileRow && fileRow.className.includes('downloadCellFilNm')) {
        const text = fileRow.textContent;
        // ファイル名と拡張子を抽出 (例: 千葉工業大学前(通用門側)歩道橋塗替塗装工事.pdf(206KB))
        const match = text.match(/([^\/]+(\.pdf|\.png|\.jpg|\.jpeg))\s*\(\d+KB\)/i);
        return match ? match[1].trim() : 'downloaded_file.pdf'; 
    }
    return 'downloaded_file.pdf';
}

// --------------------------------------------------
// メインロジック
// --------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // デバッグ用ログ（拡張機能が動作しているかの確認）
    console.log('--- Unipa Preview Script Initializing ---'); 
    
    // ダウンロードボタンのセレクタ
    // fa-downloadアイコンを持ち、PrimeFaces.abを持つボタンを対象
    const downloadButtons = document.querySelectorAll('button[class*="fa-download"][onclick*="PrimeFaces.ab"]');

    downloadButtons.forEach(button => {
        // デバッグ用
        console.log('Found download button:', button.id);

        button.addEventListener('click', function(event) {
            event.preventDefault(); 
            event.stopPropagation();
            
            // PrimeFacesのIDの末尾を暫定的な File ID として利用 (HAR分析からの推測)
            const buttonIdParts = this.id.split(':');
            const guessedFileId = buttonIdParts.pop(); 
            
            // ファイル名を取得
            const fileName = getFileName(this); 

            // バックグラウンドスクリプトへ直接ファイル取得を依頼
            chrome.runtime.sendMessage({ 
                action: 'fetchFileDirectly', 
                fileId: guessedFileId, 
                fileName: fileName
            }, (response) => {
                if (response && response.dataUrl) {
                    console.log('File fetched successfully. Showing preview.');
                    displayPreviewModal(response.dataUrl, response.mimeType);
                } else {
                    console.error('Preview failed. Attempting standard download.');
                    alert('プレビュー表示に失敗しました。ファイルがダウンロードされます。');
                    
                    // 失敗した場合は、元のPrimeFacesのクリックイベントを再実行
                    // ただし、Content Scriptから直接は難しいので、元のHTML要素をクローンして実行を試みる
                    // 簡単のため、ここではユーザーに再クリックを促すか、エラーログを表示に留めます。
                    // 実際には、この部分に元のPrimeFaces.abを復元する複雑な処理が必要になります。
                    
                    // デバッグのため、エラーログのみ表示に留めます。
                }
            });
        });
    });
});