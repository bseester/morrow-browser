const https = require('https');
const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');

const extensionId = 'jghecgabfgfdldnmbfkhmffcabddioke';
const crxUrl = `https://clients2.google.com/service/update2/crx?response=redirect&prodversion=120.0.0.0&acceptformat=crx2,crx3&x=id%3D${extensionId}%26updatable%3Dfalse%26uc`;

console.log("Fetching...", crxUrl);

function downloadAndExtract(url, targetDir) {
  https.get(url, (res) => {
    if (res.statusCode === 301 || res.statusCode === 302) {
      downloadAndExtract(res.headers.location, targetDir);
      return;
    }
    
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', async () => {
      let buf = Buffer.concat(chunks);
      
      // Look for ZIP magic header
      const zipMagic = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
      const zipOffset = buf.indexOf(zipMagic);
      
      if (zipOffset !== -1) {
        buf = buf.slice(zipOffset);
      }
      
      try {
        const directory = await unzipper.Open.buffer(buf);
        await directory.extract({ path: targetDir });
        console.log("Success extracting");
      } catch (err) {
        console.error("Unzip error:", err);
      }
    });
  });
}

downloadAndExtract(crxUrl, './test-ext');
