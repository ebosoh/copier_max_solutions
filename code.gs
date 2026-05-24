/**
 * Copier Maximum Solutions - Backend Script
 * Deploy this as a Web App to serve as your API.
 */

var ADMIN_PASSWORD = "YOUR_ADMIN_PASSWORD"; // Protects your database!
var GITHUB_TOKEN = "YOUR_GITHUB_TOKEN"; // Store your token securely here
var GITHUB_USERNAME = "ebosoh";
var GITHUB_REPO = "copiermaxsolutions";
var GITHUB_BRANCH = "main";

function uploadToGitHub(fileName, base64Content) {
  var name = fileName || "unnamed-image.png";
  var timestamp = new Date().getTime();
  var safeName = name.replace(/[^a-zA-Z0-9.]/g, '-').toLowerCase();
  var path = timestamp + "-" + safeName;
  var url = "https://api.github.com/repos/" + GITHUB_USERNAME + "/" + GITHUB_REPO + "/contents/" + path;

  var payload = {
    message: "Upload product image: " + safeName,
    content: base64Content,
    branch: GITHUB_BRANCH
  };

  var options = {
    method: "put",
    headers: {
      "Authorization": "token " + GITHUB_TOKEN,
      "Accept": "application/vnd.github.v3+json"
    },
    payload: JSON.stringify(payload),
    contentType: "application/json",
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  var json = JSON.parse(response.getContentText());
  
  if (response.getResponseCode() !== 201 && response.getResponseCode() !== 200) {
    throw new Error("GitHub Upload Error: " + (json.message || "Unknown error"));
  }
  
  return "https://raw.githubusercontent.com/" + GITHUB_USERNAME + "/" + GITHUB_REPO + "/" + GITHUB_BRANCH + "/" + path;
}

// 1. Handle Writes (Add/Edit/Delete Product)
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var data = JSON.parse(e.postData.contents);
    
    // --- Security Enforcement ---
    if (data.password !== ADMIN_PASSWORD) {
       return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": "Unauthorized Access" })).setMimeType(ContentService.MimeType.JSON);
    }
    // ----------------------------

    var action = data.action || 'add';

    if (action === 'delete') {
      var rowIndex = parseInt(data.rowId, 10);
      sheet.deleteRow(rowIndex);
      return ContentService.createTextOutput(JSON.stringify({ "result": "success", "message": "Product Deleted" })).setMimeType(ContentService.MimeType.JSON);
    } 
    
    // For Add or Edit, we might have new images to upload first.
    let finalImagesStr = data.images || ""; // Contains existing imagesCSV
    
    if (data.imageFiles && data.imageFiles.length > 0) {
      var newImageUrls = [];
      for (var k = 0; k < data.imageFiles.length; k++) {
        var fileObj = data.imageFiles[k];
        var fileName = fileObj.name || fileObj.fileName || fileObj.filename || ("image-" + k + ".png");
        var url = uploadToGitHub(fileName, fileObj.content);
        newImageUrls.push(url);
      }
      
      if (finalImagesStr) {
        finalImagesStr += "," + newImageUrls.join(',');
      } else {
        finalImagesStr = newImageUrls.join(',');
      }
    }

    if (action === 'edit') {
      var rowIndex = parseInt(data.rowId, 10);
      sheet.getRange(rowIndex, 1, 1, 7).setValues([[ data.name, data.category, data.price, data.old_price, data.description, finalImagesStr, new Date() ]]);
      return ContentService.createTextOutput(JSON.stringify({ "result": "success", "message": "Product Updated" })).setMimeType(ContentService.MimeType.JSON);
    } else {
      sheet.appendRow([ data.name, data.category, data.price, data.old_price, data.description, finalImagesStr, new Date() ]);
      return ContentService.createTextOutput(JSON.stringify({ "result": "success", "message": "Product Added" })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": err.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// 2. Handle Reads (Get Products) - JSON API used by the website & admin
function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  var rows = sheet.getDataRange().getValues();
  var headers = rows[0];
  var products = [];

  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    // Skip empty rows (e.g. trailing blank rows in the sheet)
    if (!row[0] || row[0].toString().trim() === '') continue;

    var product = { rowId: i + 1 }; // rowId is 1-indexed sheet row number
    for (var j = 0; j < headers.length; j++) {
      product[headers[j]] = row[j];
    }
    products.push(product);
  }

  return ContentService.createTextOutput(JSON.stringify(products)).setMimeType(ContentService.MimeType.JSON);
}

// 3. Setup Helper
function setupSheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["name", "category", "price", "old_price", "description", "images", "date_added"]);
  }
}
