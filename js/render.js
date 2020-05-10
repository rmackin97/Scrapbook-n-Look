"use strict";

const XML = require("../js/xml-builder");
// application components 
const { DocumentItem } = require("../js/components/document-item");
const { FolderItem, backDropHandler } = require("../js/components/folder-item");
const { TabItem } = require("../js/components/tab-item");
const { DocumentContextMenuItem, FolderContextMenuItem } = require("../js/components/contextmenu-item");
// search functions
const { searchHandler, openSearchOptions } = require("../js/search");

// used to communicate between this process and the main.js application process
const { ipcRenderer } = require("electron");
// used to parse the structure.xml file
const cheerio = require("cheerio");

const path = require("path");
const fs = require("fs");

// used to determine the path the Downloads folder
const downloadsFolder = require("downloads-folder");
// full path to the WebScrapBook data directory
const wsbPath = path.join(downloadsFolder(), "WebScrapBook/data");
// full path to the .structure.xml file
const xmlPath = path.join(downloadsFolder(), "WebScrapBook/.structure.xml");

function renderDocumentView(folderPath){
    let data = fs.readFileSync(xmlPath);
    let $ = cheerio.load(data, { xmlMode: true });

    // gets the directory contents at folderPath location from XML structure
    const contents = getDirectoryContents(folderPath);
    const folders = contents[0];
    const documents = contents[1];

    // sets current directory view name and folderpath attribute; hides/unhides appropraite buttons
    const dirName = folderPath.split("/").pop();
    if(dirName == "root"){
        document.getElementById("directory-name").innerHTML = "Home";
        // hides back button if in the Home view
        document.getElementById("back-btn").setAttribute("hidden", true);
    } else{
        document.getElementById("directory-name").innerHTML = dirName;
        document.getElementById("back-btn").removeAttribute("hidden");
    }
    document.getElementById("directory-name").setAttribute("data-folderpath", folderPath);
    document.getElementById("close-btn").setAttribute("hidden", true);
    // clears out user search query input (if any exists)
    document.getElementById("search-input").value = "";

    // renders all folders at this folder path location
    for(let i = 0; i < folders.length; i++){
        let folder = folders[i];

        let name = $(folder).attr("name");
        let path = $(folder).attr("folderPath");

        renderFolder(name, path);
    }

    // renders all documents at this folder path location
    for(let i = 0; i < documents.length; i++){
        let document = documents[i];

        let id = $(document).attr("id");
        let displayName = $(document).attr("displayName");
        let documentPath = $(document).attr("documentPath");

        renderDocument(id, displayName, documentPath, folderPath);
    }
}

// used with "Close" button on search document view
function renderCurrDocumentView(){
    // gets the folderPath of the current document view
    let folderPath = document.getElementById("directory-name").getAttribute("data-folderpath");

    // clears out user search query input
    document.getElementById("search-input").value = "";

    // flushes the current directory view
    flushDocumentView();
    // renders this document view
    renderDocumentView(folderPath);
}

// used with "Back" button
function renderPrevDocumentView(){
    // gets the folderPath of the current document view
    let folderPath = document.getElementById("directory-name").getAttribute("data-folderpath");

    // clears out user search query input (if any exists)
    document.getElementById("search-input").value = "";

    // checks that document view is not currently root (can't go above than root)
    if(folderPath != "root"){
        // flushes the current directory view
        flushDocumentView();

        let path = folderPath.split("/");
        path.pop(); // removes the current directory from path
        // renders previous directory view
        renderDocumentView(path.join("/"));
    } 
}

// used with "Home" button
function renderHomeDocumentView(){
    // clears out user search query input (if any exists)
    document.getElementById("search-input").value = "";

    // flushes the current directory view
    flushDocumentView();
    // renders the root (Home) documnet view
    renderDocumentView("root");
}

function renderSearchDocumentView(documents){
    let data = fs.readFileSync(xmlPath);
    let $ = cheerio.load(data, { xmlMode: true });

    document.getElementById("directory-name").innerHTML = "Search Results";
    document.getElementById("back-btn").setAttribute("hidden", true);
    document.getElementById("close-btn").removeAttribute("hidden");

    // flushes the current document view
    flushDocumentView();
    // renders all resulting documents
    for(let i = 0; i < documents.length; i++){
        let document = documents[i];

        let id = $(document).attr("id");
        let displayName = $(document).attr("displayName");
        let documentPath = $(document).attr("documentPath");

        renderDocument(id, displayName, documentPath, null, true);
    }
}

// removes all rendered folder-items and document-items from the current document view
function flushDocumentView(){
    // removes all folder-items from the current document view
    const folderContainer = document.getElementById("folder-container");
    let folderItem = folderContainer.lastElementChild;
    while(folderItem){
        folderContainer.removeChild(folderItem);
        folderItem = folderContainer.lastElementChild;
    }

    // removes all document-items from the current document view
    const documentContainer = document.getElementById("document-container");
    let documentItem = documentContainer.lastElementChild;
    while(documentItem){
        documentContainer.removeChild(documentItem);
        documentItem = documentContainer.lastElementChild;
    }
}

// returns the directory contents at folderPath location from XML structure
function getDirectoryContents(folderPath){
    let data = fs.readFileSync(xmlPath);
    let $ = cheerio.load(data, { xmlMode: true });

    let contents = [];

    let folders = [];
    // get each folder at this folder path location
    $("Root").find("Folder").each((i, folder) => {
        let path = $(folder).attr("folderPath").split("/");
        path.pop();
        path = path.join("/");

        if(path == folderPath){
            folders.push(folder);
        }
    });

    let documents = [];
    // get each document at this folder path location
    $("Root").find("Document").each((i, document) => {
        if($(document).attr("folderPath") == folderPath){
            documents.push(document);
        }
    });

    contents.push(folders);
    contents.push(documents);

    return contents;
}

// renders a document
function renderDocument(id, displayName, documentPath, folderPath, search = false){
    const documentContainer = document.getElementById("document-container");

    fs.exists(documentPath, result => {
        if(result){
            // prevents rendering duplicate documents (could occur on rerender of this directory)
            if(!documentContainer.contains(document.getElementById("document-item-"+id))){
                // creates and renders a new document-item
                let documentItem = new DocumentItem(id, displayName, documentPath, search).element;
                documentContainer.appendChild(documentItem);
            }
        } else{
            // remove document from XML structure files if it no longer exists in WebScrapBook/data
            XML.deleteXMLDocument(documentPath, folderPath);
        }
    });
}

// renders a folder
function renderFolder(name, folderPath){
    const folderContainer = document.getElementById("folder-container");

    // prevents rendering duplicate folders (could occur on rerender of this directory)
    if(!folderContainer.contains(document.getElementById("folder-item-"+name))){
        let folderItem = new FolderItem(name, folderPath).element;
        folderContainer.appendChild(folderItem);
    }
}

// prompts user to create a new folder in the current directory then renders the new folder
function renderNewFolder(){
    let folderPath = document.getElementById("directory-name").getAttribute("data-folderpath");

    // sends a new folder window prompt to main.js
    ipcRenderer.send("new-folder-window", );

    // listens for new folder name response from main.js (based on user input)
    ipcRenderer.once("new-folder-response", (event, res) => {
        // if res is null then user cancelled; else user provided a new folder name to render
        if(res != null && res != ""){
            // inserts new folder into XML structure
            let success = XML.insertXMLFolder(res, folderPath);
            
            if(success){
                // renders folder in this directory
                renderFolder(res, folderPath+"/"+res);
            } else{
                // generates an operation denied message
                ipcRenderer.send("operation-denied-window", ["folder", res]);
            }
        }
    });
}

// renders a document tab
// todo - better description
function renderTab(id, srcPath){
    const tabContainer = document.getElementById("tab-container");

    // condition prevents rendering duplicate document tabs 
    if(!tabContainer.contains(document.getElementById("tab-item-"+id))){
        // creates and renders a new tab-item
        let tabItem = new TabItem(id, srcPath).element;
        tabContainer.appendChild(tabItem);   
    }
}

// renders a context menu (for a specific document on right click)
function renderDocumentContextmenu(id, documentPath, x, y){
    // unrenders the rendered contextmenu (if exists)
    if(document.body.contains(document.getElementById("contextmenu-item"))){
        document.getElementById("contextmenu-item").remove();
    }

    let contextmenuItem = new DocumentContextMenuItem(id, documentPath).element;
    contextmenuItem.setAttribute("style", "top: "+y+"; left: "+x);

    document.body.appendChild(contextmenuItem);
}

// renders a context menu (for a specific folder on right click)
function renderFolderContextmenu(name, x, y){
    // unrenders the rendered contextmenu (if exists)
    if(document.body.contains(document.getElementById("contextmenu-item"))){
        document.getElementById("contextmenu-item").remove();
    }

    let contextmenuItem = new FolderContextMenuItem(name).element;
    contextmenuItem.setAttribute("style", "top: "+y+"; left: "+x);

    document.body.appendChild(contextmenuItem);
}

function startContextMenuListener(){
    document.body.addEventListener("click", (e) => {
        if(document.body.contains(document.getElementById("contextmenu-item"))){
            document.getElementById("contextmenu-item").remove();
        }
    });
}

// including any render functions necessary to import into components
module.exports = { flushDocumentView, renderDocumentView, renderSearchDocumentView, renderTab, 
    renderDocumentContextmenu, renderFolderContextmenu }