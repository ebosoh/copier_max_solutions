/**
 * Copier Maximum Solutions - Backend Script
 * Deploy as Web App: Execute as "Me", Access "Anyone"
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getConfig() {
  var props = PropertiesService.getScriptProperties();
  return {
    adminPassword: (
      props.getProperty("ADMIN_PASSWORD") ||
      props.getProperty("admin_password") ||
      props.getProperty("PASSWORD") ||
      props.getProperty("password") ||
      props.getProperty("ACCESS_CODE") ||
      props.getProperty("access_code") ||
      "YOUR_ADMIN_PASSWORD"
    ).toString().trim(),
    githubToken:    (props.getProperty("GITHUB_TOKEN")    || "YOUR_GITHUB_TOKEN").toString().trim(),
    githubUsername: (props.getProperty("GITHUB_USERNAME") || "ebosoh").toString().trim(),
    githubRepo:     (props.getProperty("GITHUB_REPO")     || "copiermaxsolutions").toString().trim(),
    githubBranch:   (props.getProperty("GITHUB_BRANCH")   || "main").toString().trim()
  };
}

function getOrCreateSheet(name, headers) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

function uploadToGitHub(fileName, base64Content, cfg) {
  if (!cfg.githubToken || cfg.githubToken === "YOUR_GITHUB_TOKEN") {
    throw new Error("GitHub token not configured in Script Properties.");
  }
  var safeName = (fileName || "image.png").replace(/[^a-zA-Z0-9.]/g, '-').toLowerCase();
  var path     = new Date().getTime() + "-" + safeName;
  var apiUrl   = "https://api.github.com/repos/" + cfg.githubUsername + "/" + cfg.githubRepo + "/contents/" + path;

  // Try 'Bearer' which works for both classic (ghp_) and fine-grained (github_pat_) tokens
  var response = UrlFetchApp.fetch(apiUrl, {
    method: "put",
    headers: {
      "Authorization": "Bearer " + cfg.githubToken,
      "Accept": "application/vnd.github.v3+json"
    },
    payload: JSON.stringify({
      message: "Upload: " + safeName,
      content: base64Content,
      branch: cfg.githubBranch
    }),
    contentType: "application/json",
    muteHttpExceptions: true
  });

  var code = response.getResponseCode();
  var json = JSON.parse(response.getContentText());
  if (code !== 200 && code !== 201) {
    throw new Error("GitHub API " + code + ": " + (json.message || "Unknown error") + " (repo: " + cfg.githubRepo + ", branch: " + cfg.githubBranch + ")");
  }
  return "https://raw.githubusercontent.com/" + cfg.githubUsername + "/" + cfg.githubRepo + "/" + cfg.githubBranch + "/" + path;
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ─── doPost ───────────────────────────────────────────────────────────────────

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var cfg  = getConfig();
    var data = JSON.parse(e.postData.contents);

    var incoming = (data.password || "").toString().trim();
    if (incoming !== cfg.adminPassword) {
      return jsonOut({ result: "error", error: "Unauthorized Access" });
    }

    var action = data.action || "add";
    var sheet;
    var rowIndex;
    var uploadWarning = "";

    // ── Brands ──────────────────────────────────────────────────────────────
    if (action === "add_brand") {
      sheet = getOrCreateSheet("brands", ["name", "logo_url", "date_added"]);
      var logoUrl = "";
      if (data.imageFile) {
        try   { logoUrl = uploadToGitHub(data.imageFile.name, data.imageFile.content, cfg); }
        catch (err) {
          console.error("Brand logo upload: " + err);
          uploadWarning = err.toString();
        }
      }
      sheet.appendRow([data.name, logoUrl, new Date()]);
      return jsonOut({ result: "success", message: "Brand Added", upload_warning: uploadWarning });
    }

    if (action === "delete_brand") {
      sheet    = getOrCreateSheet("brands", ["name", "logo_url", "date_added"]);
      rowIndex = parseInt(data.rowId, 10);
      sheet.deleteRow(rowIndex);
      return jsonOut({ result: "success", message: "Brand Deleted" });
    }

    if (action === "edit_brand") {
      sheet    = getOrCreateSheet("brands", ["name", "logo_url", "date_added"]);
      rowIndex = parseInt(data.rowId, 10);
      var logoUrl = data.existingLogoUrl || "";
      if (data.imageFile) {
        try   { logoUrl = uploadToGitHub(data.imageFile.name, data.imageFile.content, cfg); }
        catch (err) {
          console.error("Brand logo upload (edit): " + err);
          uploadWarning = err.toString();
        }
      }
      sheet.getRange(rowIndex, 1, 1, 3).setValues([[data.name, logoUrl, new Date()]]);
      return jsonOut({ result: "success", message: "Brand Updated", upload_warning: uploadWarning });
    }

    // ── Testimonials ────────────────────────────────────────────────────────
    if (action === "add_testimonial") {
      sheet = getOrCreateSheet("testimonials", ["name", "role", "text", "rating", "photo_url", "date_added"]);
      var photoUrl = "";
      if (data.imageFile) {
        try   { photoUrl = uploadToGitHub(data.imageFile.name, data.imageFile.content, cfg); }
        catch (err) {
          console.error("Client photo upload: " + err);
          uploadWarning = err.toString();
        }
      }
      sheet.appendRow([data.name, data.role, data.text, data.rating, photoUrl, new Date()]);
      return jsonOut({ result: "success", message: "Testimonial Added", upload_warning: uploadWarning });
    }

    if (action === "delete_testimonial") {
      sheet    = getOrCreateSheet("testimonials", ["name", "role", "text", "rating", "photo_url", "date_added"]);
      rowIndex = parseInt(data.rowId, 10);
      sheet.deleteRow(rowIndex);
      return jsonOut({ result: "success", message: "Testimonial Deleted" });
    }

    if (action === "edit_testimonial") {
      sheet    = getOrCreateSheet("testimonials", ["name", "role", "text", "rating", "photo_url", "date_added"]);
      rowIndex = parseInt(data.rowId, 10);
      var photoUrl = data.existingPhotoUrl || "";
      if (data.imageFile) {
        try   { photoUrl = uploadToGitHub(data.imageFile.name, data.imageFile.content, cfg); }
        catch (err) {
          console.error("Client photo upload (edit): " + err);
          uploadWarning = err.toString();
        }
      }
      sheet.getRange(rowIndex, 1, 1, 6).setValues([[data.name, data.role, data.text, data.rating, photoUrl, new Date()]]);
      return jsonOut({ result: "success", message: "Testimonial Updated", upload_warning: uploadWarning });
    }

    // ── Products ────────────────────────────────────────────────────────────
    sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    if (action === "delete") {
      rowIndex = parseInt(data.rowId, 10);
      sheet.deleteRow(rowIndex);
      return jsonOut({ result: "success", message: "Product Deleted" });
    }

    var finalImagesStr = data.images || "";
    if (data.imageFiles && data.imageFiles.length > 0) {
      var newUrls = [];
      for (var k = 0; k < data.imageFiles.length; k++) {
        var fileObj = data.imageFiles[k];
        var fname   = fileObj.name || fileObj.fileName || fileObj.filename || ("image-" + k + ".png");
        try {
          newUrls.push(uploadToGitHub(fname, fileObj.content, cfg));
        } catch (err) {
          console.error("Product image upload: " + err);
          uploadWarning = err.toString();
        }
      }
      var validUrls = newUrls.filter(function(u) { return u && u.length > 0; });
      if (validUrls.length > 0) {
        finalImagesStr = finalImagesStr ? finalImagesStr + "," + validUrls.join(",") : validUrls.join(",");
      }
    }

    if (action === "edit") {
      rowIndex = parseInt(data.rowId, 10);
      sheet.getRange(rowIndex, 1, 1, 7).setValues([[
        data.name, data.category, data.price, data.old_price,
        data.description, finalImagesStr, new Date()
      ]]);
      return jsonOut({ result: "success", message: "Product Updated", upload_warning: uploadWarning });
    }

    sheet.appendRow([data.name, data.category, data.price, data.old_price, data.description, finalImagesStr, new Date()]);
    return jsonOut({ result: "success", message: "Product Added", upload_warning: uploadWarning });

  } catch (err) {
    return jsonOut({ result: "error", error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

// ─── doGet ────────────────────────────────────────────────────────────────────

function doGet(e) {
  var type = e && e.parameter && e.parameter.type;

  // Diagnostic endpoint — confirms Script Properties keys are visible
  if (type === "diagnose") {
    var cfg  = getConfig();
    var keys = PropertiesService.getScriptProperties().getKeys();
    return jsonOut({
      keys_detected: keys,
      has_admin_password: cfg.adminPassword !== "YOUR_ADMIN_PASSWORD",
      has_github_token:   cfg.githubToken   !== "YOUR_GITHUB_TOKEN"
    });
  }

  var sheet;
  if (type === "brands") {
    sheet = getOrCreateSheet("brands", ["name", "logo_url", "date_added"]);
  } else if (type === "testimonials") {
    sheet = getOrCreateSheet("testimonials", ["name", "role", "text", "rating", "photo_url", "date_added"]);
  } else {
    sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  }

  var rows    = sheet.getDataRange().getValues();
  var headers = rows[0];
  var list    = [];

  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    if (!row[0] || row[0].toString().trim() === "") continue;
    var item = { rowId: i + 1 };
    for (var j = 0; j < headers.length; j++) {
      item[headers[j]] = row[j];
    }
    list.push(item);
  }

  return jsonOut(list);
}

// ─── Setup ────────────────────────────────────────────────────────────────────

function setupSheet() {
  getOrCreateSheet("products",     ["name", "category", "price", "old_price", "description", "images", "date_added"]);
  getOrCreateSheet("brands",       ["name", "logo_url", "date_added"]);
  getOrCreateSheet("testimonials", ["name", "role", "text", "rating", "photo_url", "date_added"]);
}
