//參考文件:https://developers.google.com/admin-sdk/reports/v1/quickstart/js?hl=zh-tw
// TODO: Set the below credentials
const CLIENT_ID = '申請方式見google文件或別人的部落格';
//原版
// 537132813552-c3vdgqhhkdrlc7gjcq30o78kpc3ul39l.apps.googleusercontent.com
// AIzaSyB5YeV-HSgzVf2Mz1t--Pp7ZY-aeaUERsg
const API_KEY = '申請方式見google文件或別人的部落格';

// Discovery URL for APIs used by the quickstart
const DISCOVERY_DOC = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest', 'https://people.googleapis.com/$discovery/rest?version=v1'];

// Set API access scope before proceeding authorization request
const SCOPES = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
let tokenClient;
let gapiInited = false;
let gisInited = false;

const IMW = 580;   // 調整圖片寬度的參數
let folderName = "OCR-test"; //google drive文件夾名稱

document.getElementById('authorize_button').style.visibility = 'hidden';
document.getElementById('signout_button').style.visibility = 'hidden';

document.getElementById('debug').innerHTML = "系統載入完成...";  // 小蟲對話框(狀態顯示列)

let stage='';  // 與官方文件不同，待查

/**
 * Callback after api.js(html 53th) is loaded, html 54th
 */
function gapiLoaded() {
	gapi.load('client', initializeGapiClient);
}

/**
 * Callback after the API client is loaded. Loads the
 * discovery doc to initialize the API.
 */
async function initializeGapiClient() {
	await gapi.client.init({
		apiKey: API_KEY,
		discoveryDocs: DISCOVERY_DOC,
	});
	gapiInited = true;
	maybeEnableButtons();
}

/**
 * Callback after Google Identity Services are loaded.認證google帳號，html 54th
 */
function gisLoaded() {
	tokenClient = google.accounts.oauth2.initTokenClient({
		client_id: CLIENT_ID,
		scope: SCOPES,
		callback: '', // defined later
	});
	gisInited = true;
	maybeEnableButtons();
}

/**
 * Enables user interaction after all libraries are loaded.
 */
function maybeEnableButtons() {
	if (gapiInited && gisInited) {
		document.getElementById('authorize_button').style.visibility = 'visible';
	}
}

/**
 *	Sign in the user upon button click, html 27th
 */
function handleAuthClick() {    // 為了串到資料庫，此處與官方文件不同                  
	if(document.getElementById("upfile").files[0] === undefined){     
		alert('請選擇圖片');
		document.getElementById('content').innerHTML = '請選擇圖片';
		throw "Image not select!";
	}
	tokenClient.callback = async (resp) => {
		if (resp.error !== undefined) {
			throw (resp);
		}
		document.getElementById('signout_button').style.visibility = 'visible';
		document.getElementById('authorize_button').value = '重新查核';
		await uFile();
	};

	if (gapi.client.getToken() === null) {
		// Prompt the user to select a Google Account and ask for consent to share their data
		// when establishing a new session.
		tokenClient.requestAccessToken({
			prompt: 'consent'
		});
	} else {
		// Skip display of account chooser and consent dialog for an existing session.
		tokenClient.requestAccessToken({
			prompt: ''
		});
	}
}

/**
 *	Sign out the user upon button click, 登出 html 28th，功能故障疑似自己html改版後content跑掉
 */
function handleSignoutClick() {
	const token = gapi.client.getToken();
	if (token !== null) {
		google.accounts.oauth2.revoke(token.access_token);
		gapi.client.setToken('');
		document.getElementById('content').innerHTML = '您已經登出感謝您的使用！';
		document.getElementById('authorize_button').value = '認証並查核標示';
		document.getElementById('signout_button').style.visibility = 'hidden';
	}
}

/**
 * Upload file to Google Drive.
 */
async function uFile() {
	document.getElementById('content').innerHTML = '上傳辨識中，請稍候！';
	document.getElementById('debug').innerHTML += "<br />進入上傳程序...";
	var accessToken = gapi.auth.getToken().access_token; // Here gapi is used for retrieving the access token.
	//console.log((await gapi.client.oauth2.userinfo.get()).result);
	var xhr = new XMLHttpRequest();
	xhr.open('get', 'https://www.googleapis.com/drive/v2/files?q=title%3D\'OCR_test\'%20and%20mimeType%3D\'application%2Fvnd.google-apps.folder\'%20and%20trashed%3Dfalse&spaces=drive&key=' + API_KEY, true);
	xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
	xhr.setRequestHeader('Accept', 'application/json');
	xhr.responseType = 'json';
	xhr.send();

	xhr.onload = function() {
		if (xhr.response.items.length == 1) {
			document.getElementById('debug').innerHTML += "<br />找到OCR_test資料夾，fid="+xhr.response.items[0].id+"使用該資料夾...";
			uploadFile(xhr.response.items[0].id);
		} else {
			document.getElementById('debug').innerHTML += "<br />找不到到OCR_test資料夾，建立資料夾程序...";
			cfolder();
		}

	}

	//var fileContent = 'Hello World'; // As a sample, upload a text file.
	function cfolder() {
		var metadata = {
			'name': 'OCR_test', // Filename at Google Drive
			'mimeType': "application/vnd.google-apps.folder"
		};
		var form = new FormData();
		form.append('metadata', new Blob([JSON.stringify(metadata)], {
			type: 'application/json'
		}));
		var accessToken = gapi.auth.getToken().access_token; // Here gapi is used for retrieving the access token.
		var xhr = new XMLHttpRequest();
		xhr.open('post', 'https://www.googleapis.com/upload/drive/v3/files?fields=id', true);
		xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
		xhr.responseType = 'json';
		xhr.send(form);
		xhr.onload = function() {
			document.getElementById('debug').innerHTML += "資料夾建立完成，fid=" + xhr.response.id + "...";
			uploadFile(xhr.response.id);
		};
	}


	function uploadFile(fid) {

		if(stage.active){
			document.getElementById('debug').innerHTML += "<br />使用裁切圖片上傳...";
			var file = convertBase64ToBlob(readcorp(stage));
		}else{
			document.getElementById('debug').innerHTML += "<br />使用未裁切圖片上傳...";
			var file = document.getElementById('upfile').files[0];
		}


		var metadata = {
			'name': 'sample-file-via-js', // Filename at Google Drive
			'mimeType': file.type, // mimeType at Google Drive
			// TODO [Optional]: Set the below credentials
			// Note: remove this parameter, if no target is needed
			'parents': [fid], // Folder ID at Google Drive which is optional
		};

		var form = new FormData();
		form.append('metadata', new Blob([JSON.stringify(metadata)], {
			type: 'application/json'
		}));
		form.append('file', file);

		var accessToken = gapi.auth.getToken().access_token; // Here gapi is used for retrieving the access token.
		console.log(gapi.auth.getToken())
		var xhr = new XMLHttpRequest();
		xhr.open('post', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', true);
		xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
		xhr.responseType = 'json';
		xhr.send(form);

		xhr.onload = function() {
			document.getElementById('debug').innerHTML += "<br />File uploaded successfully. The Google Drive file id is <b>" + xhr.response.id + "</b>";
			toOCR(xhr.response.id);
		};
	}

	function toOCR(id) {
		document.getElementById('debug').innerHTML += "<br />OCRing... Please Wait...";

		return gapi.client.drive.files.copy({
				"fileId": id,
				"resource": {
					"mimeType": "application/vnd.google-apps.document"
				}
		}).then(function(response) {
			// Handle the results here (response.result has the parsed body).
			document.getElementById('debug').innerHTML += "done!<br />File OCR successfully. The Google Drive OCR file id is <b>" + response.result.id + "</b>";
			var xhr = new XMLHttpRequest();
			xhr.open('get', 'https://www.googleapis.com/drive/v3/files/' + response.result.id + '/export?mimeType=text%2Fplain&key=' + API_KEY);

			var accessToken = gapi.auth.getToken().access_token;

			xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
			xhr.responseType = 'text';
			xhr.send();
			xhr.onload = function() {
					ocr_text = xhr.responseText;
					document.getElementById('debug').innerHTML += "<br />中文辨識如下<br /><pre>" + ocr_text + "</pre><br />傳小幫手回復...";
					ChatGPT(ocr_text);
				};
			},function(err) {
				console.error("Execute error", err);
			}
		);
	}

	async function ChatGPT(resp) {
		document.getElementById('debug').innerHTML += "done!<br />等待小幫手回復...";
		const k = await gapi.client.people.people.get({"resourceName": "people/me","personFields": "emailAddresses"});
		const j = k.result.emailAddresses[0].value;
		var xhr = new XMLHttpRequest();
		xhr.open('post', '/gpt');
		var form = new FormData();
		form.append('resp_msg', new Blob([resp], {
			type: 'text'
		}));
		form.append('email', j)
		xhr.responseType = 'text';
		xhr.send(form);
		xhr.onload = function() {
			i = xhr.responseText;
			document.getElementById('debug').innerHTML += "<br />小幫手回覆如下：<br /><pre>" + i + "</pre>";
			document.getElementById('content').innerHTML = "小幫手回覆如下：<pre>" + i + "</pre>";
		}
	}
}

/**
 * Convert BASE64 to BLOB
 * @param base64Image Pass Base64 image data to convert into the BLOB
 */
function convertBase64ToBlob(base64Image) {
	// Split into two parts
	var parts = base64Image.split(';base64,');

	// Hold the content type
	var imageType = parts[0].split(':')[1];

	// Decode Base64 string
	var decodedData = window.atob(parts[1]);

	// Create UNIT8ARRAY of size same as row data length
	var uInt8Array = new Uint8Array(decodedData.length);

	// Insert all character code into uInt8Array
	for (let i = 0; i < decodedData.length; ++i) {
		uInt8Array[i] = decodedData.charCodeAt(i);
	}

	// Return BLOB image after conversion
	return new Blob([uInt8Array], {
		type: imageType
	});
}

//上傳圖片，html 26th
function PreviewImg() {    

	var oFReader = new FileReader();
	oFReader.readAsDataURL(document.getElementById("upfile").files[0]);
	document.getElementById("cropContainer").innerHTML = '<img id="upPreview">';

	oFReader.onload = function(oFREvent) {
		var image = new Image();
		image.src = oFREvent.target.result;

		image.onload = function() {
			if (this.width > IMW) {
				document.getElementById("upPreview").width = IMW;
			} else {
				document.getElementById("upPreview").width = this.width;
			}
		};

		document.getElementById("upPreview").src = oFREvent.target.result;
	};
	stage = Jcrop.attach('upPreview');
};

function readcorp(cpim) {

	var j = cpim.active.pos;

	var canvas = document.createElement("canvas");
	var i = new Image();
	i.src = document.getElementById("upPreview").src;

	if (i.width > IMW) {
		k = i.width / IMW;
	} else {
		k = 1;
	}

	canvas.width = j.w * k;
	canvas.height = j.h * k;

	var ctx = canvas.getContext("2d");
	ctx.drawImage(i, -j.x * k, -j.y * k);

	return canvas.toDataURL();
};
