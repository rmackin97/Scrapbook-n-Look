"use strict";

/*
 * This file is used to build the XML file that will store
 * the virtual file structure of our application.
 */

 // used to parse and read XML/HTML
const cheerio = require("cheerio");

// used to read and write XML
const convert = require("xml-js");
// used to format XML output
const format = require("xml-formatter");

const path = require("path");
const fs = require("fs");

const downloadsFolder = require("downloads-folder");
const xmlPath = path.join(downloadsFolder(), "WebScrapBook/.structure.xml");

/** 
 * Inserts an XML Document tag for this document (uniquely indentified by documentPath) 
 * inside the XML structure file. Documents under the same virtual folder cannot share 
 * the same name. (Note: same name documents are allowed, just not under the same folder)
 * 
 * @param documentPath the file path to this document in the WebScrapBook/data directory
 * @param folderPath the path to the virtual folder (inside the XML structure) where this document should be stored
 * 
 * @returns true if insertion was successful; false otherwise
 */
function insertXMLDocument(documentPath, folderPath, displayName = null, dateLastViewed = null){ 
    // synchronously reads the xml file
    let data = fs.readFileSync(xmlPath);
    // converts xml to json
    let json = convert.xml2js(data, { compact: true, ignoreComment: true });
    // creates new XML Document tag
    let document = new XMLDocument(documentPath, folderPath, displayName, dateLastViewed).document;

    // inserting document at top level under root
    if(folderPath == "root"){  
        try {
            json.Root["Document"] = insertDocument(document, json.Root);
        } catch (error) {
            return false; // indicating insert failure
        }
    } 
    // inserting document into folder at folder path destination
    else{
        // recursively walks down the folder path starting from root directory
        function recInsertXMLDocument(path, currDir = json.Root){
            // insert into this directory
            if(path.length == 0){
                try {
                    currDir["Document"] = insertDocument(document, currDir);
                } catch (error) {
                    throw new Error("Attempted to add duplicate document");
                }
                return currDir;
            } 
            // find next directory in this folder path
            else{
                let nextDir = path.shift();
                let currDirFolders = currDir["Folder"];

                if(typeof currDirFolders === "undefined"){
                    // folder path does not exist; return unmodified current directory
                    return currDir;
                } else if(typeof currDirFolders.length === "undefined"){
                    let existingFolder = currDirFolders;

                    if(existingFolder["_attributes"].name == nextDir){
                        currDir["Folder"] = recInsertXMLDocument(path, existingFolder);
                        return currDir;
                    } else{
                        // folder path does not exist; return unmodified current directory
                        return currDir;
                    }
                } else{
                    let found = false;
                    for(let i = 0; i < currDirFolders.length; i++){
                        if(currDirFolders[i]["_attributes"].name == nextDir){
                            found = true;
                            currDir["Folder"][i] = recInsertXMLDocument(path, currDirFolders[i]);
                            return currDir;
                        }
                    }

                    if(!found){
                        // folder path does not exist; return unmodified current directory
                        return currDir;
                    }
                }  
            }
        }
        let path  = folderPath.split("/");
        path.shift(); // removes root from path
        try {
            json.Root = recInsertXMLDocument(path);
        } catch (error) {
            return false; // indicating insert failure
        }
    }

    // convert json to xml
    let xml = convert.js2xml(json, { compact: true });
    // synchronously writes the updated xml file
    fs.writeFileSync(xmlPath, format(xml));

    return true; // indicating insert success
}

/**
 * Helper function for insertXMLDocument. Inserts document into this virtual directory.
 * 
 * @param document the XMLDocument object to add
 * @param directory the virtual directory (folder) to add document into
 * 
 * @returns this directory with document inserted
 */
function insertDocument(document, directory){
    let dirDocuments = directory["Document"];

    // due to the way xml-js parses XML these three conditions must be checked
    // case 1: zero documents exist
    if(typeof dirDocuments === "undefined"){
        dirDocuments = document;
    } 
    // case 2: exactly one document exists
    else if(typeof dirDocuments.length === "undefined"){
        let existingDocument = dirDocuments;

        // condition prevents the addition of identical documents under the same directory
        if(existingDocument["_attributes"].documentPath != document["_attributes"].documentPath){
            dirDocuments = [existingDocument];
            dirDocuments.push(document);   
        } else{
            throw new Error("Attempted to add duplicate document");
        }
    } 
    // case 3: two or more documents exist
    else{
        // determines if this document is unique (by documentPath) under this directory
        let unique = true;
        for(let i = 0; i < dirDocuments.length; i++){
            if(dirDocuments[i]["_attributes"].documentPath == document["_attributes"].documentPath){
                unique = false;
                break;
            }
        }
        
        // condition prevents the addition of same name folders under the same directory
        if(unique){
            dirDocuments.push(document);
        } else{
            throw new Error("Attempted to add duplicate document");
        }
    }

    return dirDocuments;
}

/**
 * Deletes the XML Document tag for the named document from the folder path destination.
 * (Note: inside a directory (folder) a documents name will unique indentify itself)
 * 
 * @param documentPath the document path of the XMLDocument object to be deleted
 * @param folderPath the path to the virtual folder (inside the XML structure) where this document should be deleted from
 * 
 * @returns true if deletion was successful; false otherwise
 */
function deleteXMLDocument(documentPath, folderPath){
    // synchronously reads the xml file
    let data = fs.readFileSync(xmlPath);
    // converts xml to json
    let json = convert.xml2js(data, { compact: true, ignoreComment: true });

    if(folderPath == "root"){
        try {
            let updatedDirDocuments = deleteDocument(documentPath, json.Root);
            if(updatedDirDocuments != null){
                json.Root["Document"] = updatedDirDocuments;
            } else{
                delete json.Root["Document"];
            }
        } catch (error) {
            return false; // indicating deletion failure
        }
    } else{
        // recursively walks down the folder path starting from root directory
        function recDeleteXMLDocument(path, currDir = json.Root){
            // delete from this directory
            if(path.length == 0){
                try {
                    let updatedDirDocuments = deleteDocument(documentPath, currDir);
                    if(updatedDirDocuments != null){
                        currDir["Document"] = updatedDirDocuments;
                    } else{
                        delete currDir["Document"];
                    }
                } catch (error) {
                    throw new Error("Document does not exist at specified folder path");
                }
                return currDir;
            } 
            // find next directory in this folder path
            else{
                let nextDir = path.shift();
                let currDirFolders = currDir["Folder"];

                if(typeof currDirFolders === "undefined"){
                    // folder path does not exist; return unmodified current directory
                    return currDir;
                } else if(typeof currDirFolders.length === "undefined"){
                    let existingFolder = currDirFolders;

                    if(existingFolder["_attributes"].name == nextDir){
                        currDir["Folder"] = recDeleteXMLDocument(path, existingFolder);
                        return currDir;
                    } else{
                        // folder path does not exist; return unmodified current directory
                        return currDir;
                    }
                } else{
                    let found = false;
                    for(let i = 0; i < currDirFolders.length; i++){
                        if(currDirFolders[i]["_attributes"].name == nextDir){
                            found = true;
                            currDir["Folder"][i] = recDeleteXMLDocument(path, currDirFolders[i]);
                            return currDir;
                        }
                    }

                    if(!found){
                        // folder path does not exist; return unmodified current directory
                        return currDir;
                    }
                }  
            }
        }
        let path  = folderPath.split("/");
        path.shift(); // removes root from path
        try {
            json.Root = recDeleteXMLDocument(path);
        } catch (error) {
            return false; // indicating deletion failure
        }
    }

    // convert json to xml
    let xml = convert.js2xml(json, { compact: true });
    // synchronously writes the updated xml file
    fs.writeFileSync(xmlPath, format(xml));

    return true; // indicating deletion success
}

/**
 * Helper function for deleteXMLDocument. Deletes document from this virtual directory.
 * 
 * @param documentPath the documentPath of the XMLDocument object to delete
 * @param directory the virtual directory (folder) to delete document from
 * 
 * @returns this directories updated document list or null if this directory no longer contains any documents after deleting
 */
function deleteDocument(documentPath, directory){
    let dirDocuments = directory["Document"];

    // case 1: zero documents exist
    if(typeof dirDocuments === "undefined"){
        throw new Error("Document does not exist at specified folder path");
    } 
    // case 2: exactly one document exists
    else if(typeof dirDocuments.length === "undefined"){
        let existingDocument = dirDocuments;

        // check if this is the correct document to delete
        if(existingDocument["_attributes"].documentPath == documentPath){
            // return null indicating that this directory no longer contains any documents
            dirDocuments = null;
        } else{
            throw new Error("Document does not exist at specified folder path");
        }
    } 
    // case 3: two or more documents exist
    else{
        let found = false;
        for(let i = 0; i < dirDocuments.length; i++){
            // check if this is the correct document to delete
            if(dirDocuments[i]["_attributes"].documentPath == documentPath){
                 // removes this document from the array of documents
                dirDocuments.splice(i, 1);
                found = true;
                break;
            }
        }

        if(!found){
            throw new Error("Document does not exist at specified folder path");
        }
    }

    // returns this directories remaining documents OR null if none remain
    return dirDocuments;
}

/**
 * Returns true if the XML structure contains the document that is uniquely identified
 * by documentPath or false if the XML structure does not contain the document.
 * (Note: documentPath uniquely identifies any given document)
 * 
 * @param documentPath the file path to this document in the WebScrapBook/data directory 
 */
function containsDocument(documentPath){
    // synchronously reads the xml file
    const data = fs.readFileSync(xmlPath);
    const $ = cheerio.load(data, { xmlMode: true });

    let found = false;
    $("Root").find("Document").each((i, document) => {
        if($(document).attr("documentPath") == documentPath){
            found = true;
        }
    });
    return found;
}

// todo - description
function moveXMLDocument(targetFolder, currentFolder, documentPath){
    let data = fs.readFileSync(xmlPath);
    const $ = cheerio.load(data, { xmlMode: true });

    // gets this document
    let document = $("Root").find("Document").filter((i, document) => {
        return $(document).attr("documentPath") == documentPath;
    });

    // gets the metadata associated with this document
    let metadata = $(document).children("Metadata");
    let displayName = $(metadata).attr("title");
    let dateLastViewed = $(metadata).attr("dateLastViewed");

    // move this document into target folder only if its name is unique inside of target folder
    if(uniqueDocumentName(displayName, targetFolder)){
        // move operation comprised of delete then insert
        deleteXMLDocument(documentPath, currentFolder);
        insertXMLDocument(documentPath, targetFolder, displayName, dateLastViewed);

        // indicating successful move operation
        return true;
    } else{
        // indicating failed move operation
        return false;
    }
}

// TODO description
// renames the document uniquely identified by documentPath
function renameXMLDocument(newDisplayName, documentPath){
    // synchronously reads the xml file
    let data = fs.readFileSync(xmlPath);
    const $ = cheerio.load(data, { xmlMode: true });

    // finds and renames this XML document
    $("Root").find("Document").each((i, document) => {
        if($(document).attr("documentPath") == documentPath){
            $(document).attr("displayName", newDisplayName);

            // updates metadata title attribute
            $(document).children("Metadata").attr("title", newDisplayName);
        }
    });

    fs.writeFileSync(xmlPath, $.html());
}

// TODO description
// checks folderPath location to verify if name argument is a unique document name
// used when renaming and moving a document
function uniqueDocumentName(displayName, folderPath){
    // synchronously reads the xml file
    let data = fs.readFileSync(xmlPath);
    const $ = cheerio.load(data, { xmlMode: true });

    let unique = true;
    $("Root").find("Document").each((i, document) => {
        if($(document).attr("folderPath") == folderPath && $(document).attr("displayName") == displayName){
            unique = false;
        }
    });

    return unique;
}

// updates date last viewed metadata attribute whenever a document is viewed (on click)
function updateDateLastViewed(documentPath){
    let data = fs.readFileSync(xmlPath);
    const $ = cheerio.load(data, { xmlMode: true });

    let document = $("Root").find("Document").filter((i, document) => {
        return $(document).attr("documentPath") == documentPath;
    });

    $(document).children("Metadata").attr("dateLastViewed", new Date());

    fs.writeFileSync(xmlPath, $.html());
}

// returns all folder and subfolder documents that are contained under the specified folder path
// used when deleting a folder (to determine which documents must also be deleted)
function getFolderDocuments(folderPath){
    // synchronously reads the xml file
    let data = fs.readFileSync(xmlPath);
    const $ = cheerio.load(data, { xmlMode: true });

    let documents = [];
    $("Root").find("Document").each((i, document) => {
        if($(document).attr("folderPath").includes(folderPath)){
            let documentIdentifiers = [];
            documentIdentifiers.push($(document).attr("id"));
            documentIdentifiers.push($(document).attr("documentPath"));

            documents.push(documentIdentifiers);
        }
    });

    return documents;
}


// target drop folder, current directory folder, source dragged folder
function moveXMLFolder(targetFolder, currentFolder, folderPath){
    // synchronously reads the xml file
    let data = fs.readFileSync(xmlPath);
    const $ = cheerio.load(data, { xmlMode: true });

    // gets this folder
    let folder = $("Root").find("Folder").filter((i, folder) => {
        return $(folder).attr("folderPath") == folderPath;
    });

    let name = $(folder).attr("name");
    if(uniqueFolderName(name, targetFolder)){
        // the new folder path location of the moved folder
        let newFolderPath = targetFolder+"/"+name;

        // gets all subfolders and updates their folder path
        let subfolders = [];
        $(folder).find("Folder").each((i, folder) => {
            let updatedFolderPath = $(folder).attr("folderPath").replace(folderPath, newFolderPath);
            $(folder).attr("folderPath", updatedFolderPath);
            subfolders.push(folder);
        });

        // gets all documents and updates their folder path
        let documents = [];
        $(folder).find("Document").each((i, document) => {
            let updatedFolderPath = $(document).attr("folderPath").replace(folderPath, newFolderPath);
            $(document).attr("folderPath", updatedFolderPath);
            documents.push(document);
        });

        // delete this folder and all of its contents from the XML file
        deleteXMLFolder(name, currentFolder);

        // moving folder to target location
        insertXMLFolder(name, targetFolder);

        // moving subfolders to target location
        for(let i = 0; i < subfolders.length; i++){
            let subfolder = subfolders[i];

            let name = $(subfolder).attr("name");
            let folderPath = $(subfolder).attr("folderPath").split("/");
            folderPath.pop();
            folderPath = folderPath.join("/");

            insertXMLFolder(name, folderPath);
        }

        // moving all contained documents to target location
        for(let i = 0; i < documents.length; i++){
            let document = documents[i];

            let documentPath = $(document).attr("documentPath");
            let folderPath = $(document).attr("folderPath");

            // gets document metadata
            let metadata = $(document).children("Metadata");
            let displayName = $(metadata).attr("title");
            let dateLastViewed = $(metadata).attr("dataLastViewed");

            insertXMLDocument(documentPath, folderPath, displayName, dateLastViewed);
        }

        // indicating succesful move operation
        return true;
    } else{
        // indicating failed move oepration
        return false; 
    }
}





// renames the folder uniquely indentified by folderPath
// and updates any content that references this folderPath
function renameXMLFolder(oldName, newName, folderPath){
    // synchronously reads the xml file
    let data = fs.readFileSync(xmlPath);
    const $ = cheerio.load(data, { xmlMode: true });

    // renames target folder to newDisplayName and updates the folderPath of any folder that references this folderPath
    $("Root").find("Folder").each((i, folder) => {
        if($(folder).attr("folderPath") == folderPath && $(folder).attr("name") == oldName){
            $(folder).attr("name", newName);
            
            let newFolderPath = $(folder).attr("folderPath").replace(oldName, newName);
            $(folder).attr("folderPath", newFolderPath);
        } else if($(folder).attr("folderPath").includes(folderPath)){
            let newFolderPath = $(folder).attr("folderPath").replace(oldName, newName);
            $(folder).attr("folderPath", newFolderPath);
        }
    });

    // updates the folderPath of any document that references this folderPath
    $("Root").find("Document").each((i, document) => {
        if($(document).attr("folderPath").includes(folderPath)){
            let newFolderPath = $(document).attr("folderPath").replace(oldName, newName);
            $(document).attr("folderPath", newFolderPath);
        }
    });

    fs.writeFileSync(xmlPath, $.html());
}

function uniqueFolderName(name, dirPath){
    // synchronously reads the xml file
    let data = fs.readFileSync(xmlPath);
    const $ = cheerio.load(data, { xmlMode: true });

    let folderPath = path.join(dirPath, name);

    let unique = true;
    $("Root").find("Folder").each((i, folder) => {
        if($(folder).attr("folderPath") == folderPath && $(folder).attr("name") == name){
            unique = false;
        }
    });

    return unique;
}


/**
 * Inserts an XML Folder tag for this virtual folder inside the XML structure file at
 * folderPath destination. Folders under the same virtual directory (folder) cannot share the 
 * same name. (Note: same name folders are allowed, just not under the same directory (folder))
 * 
 * @param name the name of the XMLFolder object to insert
 * @param folderPath the path to the virtual folder (inside the XML structure) where this folder should be stored
 * 
 * @returns true if insertion was successful; false otherwise
 */
function insertXMLFolder(name, folderPath){
    // synchronously reads the xml file
    let data = fs.readFileSync(xmlPath);
    // converts xml to json
    let json = convert.xml2js(data, { compact: true, ignoreComment: true });
    // creates new XML Folder tag
    let folder = new XMLFolder(name, folderPath+"/"+name).folder;

    // inserting folder at top level under root
    if(folderPath == "root"){
        try {
            // adds new folder to root directory list of folders
            json.Root["Folder"] = insertFolder(folder, json.Root);
        } catch (error) {
            return false; // indicating insert failure
        }
    } 
    // inserting folder at folder path destination
    else{
        // recursively walks down the folder path starting from root directory
        function recInsertXMLFolder(path, currDir = json.Root){
            // insert into this directory
            if(path.length == 0){
                try {
                    currDir["Folder"] = insertFolder(folder, currDir);
                } catch (error) {
                    throw new Error("Attempted to insert duplicate folder");
                }
                return currDir;
            } 
            // find next directory in this folder path
            else{
                let nextDir = path.shift();
                let currDirFolders = currDir["Folder"];

                if(typeof currDirFolders === "undefined"){
                    // folder path does not exist; return unmodified current directory
                    return currDir;
                } else if(typeof currDirFolders.length === "undefined"){
                    let existingFolder = currDirFolders;

                    if(existingFolder["_attributes"].name == nextDir){
                        currDir["Folder"] = recInsertXMLFolder(path, existingFolder);
                        return currDir;
                    } else{
                        // folder path does not exist; return unmodified current directory
                        return currDir;
                    }
                } else{
                    let found = false;
                    for(let i = 0; i < currDirFolders.length; i++){
                        if(currDirFolders[i]["_attributes"].name == nextDir){
                            found = true;
                            currDir["Folder"][i] = recInsertXMLFolder(path, currDirFolders[i]);
                            return currDir;
                        }
                    }

                    if(!found){
                        // folder path does not exist; return unmodified current directory
                        return currDir;
                    }
                }  
            }
        }
        let path  = folderPath.split("/");
        path.shift(); //removes root from path
        try {
            json.Root = recInsertXMLFolder(path);
        } catch (error) {
            return false; // indicating insert failure
        }
    }

    // convert json to xml
    let xml = convert.js2xml(json, { compact: true });
    // synchronously writes the updated xml file
    fs.writeFileSync(xmlPath, format(xml));

    return true; // indicating insert success
}

// TODO description -- helper function for insertXMLFolder
function insertFolder(folder, directory){
    let dirFolders = directory["Folder"];

    // case 1: zero folders exist
    if(typeof dirFolders === "undefined"){
        dirFolders = folder;
    } 
    // case 2: exactly one folder exists
    else if(typeof dirFolders.length === "undefined"){
        let existingFolder = dirFolders;

        // condition prevents the addition of same name folders under the same directory
        if(existingFolder["_attributes"].name != folder["_attributes"].name){
            dirFolders = [existingFolder];
            dirFolders.push(folder);   
        } else{
            throw new Error("Attempted to add duplicate folder");
        }
    } 
    // case 3: two or more folders exist
    else{
        // determines if this folder is unique (by name) under this directory
        let unique = true;
        for(let i = 0; i < dirFolders.length; i++){
            if(dirFolders[i]["_attributes"].name == folder["_attributes"].name){
                unique = false;
                break;
            }
        }
        
        // condition prevents the addition of same name folders under the same directory
        if(unique){
            dirFolders.push(folder);
        } else{
            throw new Error("Attempted to add duplicate folder");
        }
    }

    return dirFolders;
}

/**
 * Deletes the XML Folder tag for this virtual folder from folderPath location. 
 * (IMPORTANT NOTE: all contents folders and documents stored inside of this folder
 * are deleted along with the deletion of this folder)
 * 
 * @param name the name of the XMLFolder object to delete
 * @param folderPath the path to the virtual folder where this folder should be deleted from
 * 
 * @returns true if deletion was successful; false otherwise
 */
function deleteXMLFolder(name, folderPath){
    // synchronously reads the xml file
    let data = fs.readFileSync(xmlPath);
    // converts xml to json
    let json = convert.xml2js(data, { compact: true, ignoreComment: true });

    if(folderPath == "root"){
        try {
            let updatedDirFolders = deleteFolder(name, json.Root);
            if(updatedDirFolders != null){
                json.Root["Folder"] = updatedDirFolders;
            } else{
                delete json.Root["Folder"];
            }
        } catch (error) {
            return false; // indicating deletion failure
        }
    } else{
        // recursively walks down the folder path starting from root directory
        function recDeleteXMLFolder(path, currDir = json.Root){
            // delete from this directory
            if(path.length == 0){
                try {
                    let updatedDirFolders = deleteFolder(name, currDir);
                    if(updatedDirFolders != null){
                        currDir["Folder"] = updatedDirFolders;
                    } else{
                        delete currDir["Folder"];
                    }
                } catch (error) {
                    throw new Error("Folder does not exist at specified folder path");
                }
                return currDir;
            } 
            // find next directory in this folder path
            else{
                let nextDir = path.shift();
                let currDirFolders = currDir["Folder"];

                if(typeof currDirFolders === "undefined"){
                    // folder path does not exist; return unmodified current directory
                    return currDir;
                } else if(typeof currDirFolders.length === "undefined"){
                    let existingFolder = currDirFolders;

                    if(existingFolder["_attributes"].name == nextDir){
                        currDir["Folder"] = recDeleteXMLFolder(path, existingFolder);
                        return currDir;
                    } else{
                        // folder path does not exist; return unmodified current directory
                        return currDir;
                    }
                } else{
                    let found = false;
                    for(let i = 0; i < currDirFolders.length; i++){
                        if(currDirFolders[i]["_attributes"].name == nextDir){
                            found = true;
                            currDir["Folder"][i] = recDeleteXMLFolder(path, currDirFolders[i]);
                            return currDir;
                        }
                    }

                    if(!found){
                        // folder path does not exist; return unmodified current directory
                        return currDir;
                    }
                }  
            }
        }
        let path  = folderPath.split("/");
        path.shift(); // removes root from path
        try {
            json.Root = recDeleteXMLFolder(path);   
        } catch (error) {
            return false; // indicating deletion failure
        }
    }

    // convert json to xml
    let xml = convert.js2xml(json, { compact: true });
    // synchronously writes the updated xml file
    fs.writeFileSync(xmlPath, format(xml));

    return true; // indication deletion success
}

/*
 * deletes named document from this directory and returns this directories documents
 * returns null if deleting a document from this directory caused this
 * directories document array to become empty
 */
// TODO description -- helper function for deleteXMLFolder
function deleteFolder(name, directory){
    let dirFolders = directory["Folder"];

    // case 1: zero folders exist
    if(typeof dirFolders === "undefined"){
        throw new Error("Folder does not exist at specified folder path");
    } 
    // case 2: exactly one folder exists
    else if(typeof dirFolders.length === "undefined"){
        let existingFolder = dirFolders;

        // check if this is the correct folder to delete
        if(existingFolder["_attributes"].name == name){
            // return null indicating that this directory no longer contains any folders
            dirFolders = null;
        } else{
            throw new Error("Folder does not exist at specified folder path");
        }
    } 
    // case 3: two or more documents exist
    else{
        let found = false;
        for(let i = 0; i < dirFolders.length; i++){
            // check if this is the correct folder to delete
            if(dirFolders[i]["_attributes"].name == name){
                 // removes this folder from the array of documents
                dirFolders.splice(i, 1);
                found = true;
                break;
            }
        }

        if(!found){
            throw new Error("Folder does not exist at specified folder path");
        }
    }
    // returns this directories remaining documents OR null if none remain
    return dirFolders;
}






/**
 * XMLDocument object
 *      documentPath -> path/to/document/inside/WebScrapBook/data
 *      folderPath -> path/to/document/inside/virtual/folders
 * 
 * documentPath can uniquely indentify each document
 */
class XMLDocument {
    constructor(documentPath, folderPath, displayName, dateLastViewed){
        let name = displayName;
        if(name == null){
            name = getHTMLTitle(documentPath); 
        }

        let id = documentPath.split("/").pop()

        this.document = { 
            _attributes: { 
                displayName: name,
                id: id,
                documentPath: documentPath, // uniquely indentifies each document
                folderPath: folderPath
            }, Metadata: {
                _attributes: {
                    title: name,
                    dateLastViewed: dateLastViewed
                }
            }
        };
    }
}

function getHTMLTitle(documentPath){
    let srcPath = path.join(documentPath, "index.html");
    const $ = cheerio.load(fs.readFileSync(srcPath));

    // returns the HTML title
    return $("title", "head").text();
}

class XMLFolder {
    constructor(name, folderPath){
        this.folder = {
            _attributes: {
                name: name,
                folderPath: folderPath 
            }
        }
    }
}

module.exports = { 
    insertXMLDocument, deleteXMLDocument, 
    insertXMLFolder, deleteXMLFolder,
    containsDocument,                           // used for application mounting logic
    renameXMLDocument, uniqueDocumentName,      // used for document renaming logic
    getFolderDocuments,                         // used for folder deleting logic
    renameXMLFolder, uniqueFolderName,          // used for folder renaming logic
    updateDateLastViewed,                       // updates metadata values used for searching
    moveXMLDocument, moveXMLFolder
}