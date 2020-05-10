"use strict";

/*
 * This file is used to mount and update all application specific resources.
 * 
 * Application specific resources include the following:
 *      WebScrapBook/data directory (ensures this exists)
 *      structure.xml (ensures this exists and updates it as necessary across separate application loads)
 */

const XML = require("./xml-builder");

const downloadsFolder = require("downloads-folder");
const path = require("path");
const fs = require("fs");

// application specific resource locations
const wsbPath = path.join(downloadsFolder(), "WebScrapBook");
const dataPath = path.join(downloadsFolder(), "WebScrapBook/data");
const xmlPath = path.join(downloadsFolder(), "WebScrapBook/.structure.xml");


// ensures that all application specific resources are present, if not create them
function mountBuild(cb){
    if(!fs.existsSync(wsbPath)){
        fs.mkdirSync(wsbPath);
        fs.mkdirSync(dataPath);
        fs.writeFileSync(xmlPath, "<Root/>");
        
        cb();
    } else{
        if(!fs.existsSync(dataPath)){
            fs.mkdirSync(dataPath);
        }
        
        if(!fs.existsSync(xmlPath)){
            fs.writeFileSync(xmlPath, "<Root/>");
        }

        cb();
    }
}

// populates/updates the .structure.xml file as necessary
function updateBuild(){
    fs.readdir(dataPath, (err, documents) => {
        if(err) throw err; // this should never occur

        documents.forEach((document) => {
            let documentPath = path.join(dataPath, document);
            const srcPath = path.join(documentPath, "index.html");
          
            // if the XML structure file does not contain this document then insert it at root level
            // but insert only if index.html src file exists as well
            if(!XML.containsDocument(documentPath) && fs.existsSync(srcPath)){
                XML.insertXMLDocument(documentPath, "root");
            }
        });
    });
}

module.exports = () => {
    mountBuild(() => {
        updateBuild();
    });
}