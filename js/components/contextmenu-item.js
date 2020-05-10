"use strict";

const { ipcRenderer } = require("electron");

const XML = require("../xml-builder");
const { closeTab } = require("./tab-item");

const path = require("path");
const fs = require("fs");

class DocumentContextMenuItem {
    constructor(id, documentPath){
        this.element = document.createElement("div");

        // contextmenu-item identifier attributes
        this.element.setAttribute("class", "contextmenu-item");
        this.element.setAttribute("id", "contextmenu-item");

        // creating inner contextmenu-item elements
        // contextmenu-item rename button
        let renameBtn = document.createElement("input");
        renameBtn.setAttribute("class", "contextmenu-btn");
        renameBtn.setAttribute("type", "button");
        renameBtn.setAttribute("value", "Rename");
        // rename onclick event handler
        addRenameDocumentHandler(renameBtn, id, documentPath);

        // contextmenu-item delete button
        let deleteBtn = document.createElement("input");
        deleteBtn.setAttribute("class", "contextmenu-btn");
        deleteBtn.setAttribute("type", "button");
        deleteBtn.setAttribute("value", "Delete");
        // delete onclick event handler
        addDeleteDocumentHandler(deleteBtn, id, documentPath);

        // appending inner contextmenu-item elements
        this.element.appendChild(renameBtn);
        this.element.appendChild(deleteBtn);
    }
}

// rename document context menu handler
function addRenameDocumentHandler(renameBtn, id, documentPath){
    // rename onclick event handler
    renameBtn.addEventListener("click", (e) => {
        // gets the position of this doucment-item
        let position = document.getElementById("document-item-"+id).getBoundingClientRect();
 
        // creates rename overlay item
        let renameOverlay = document.createElement("form");

        // rename-overlay identifier attributes
        renameOverlay.setAttribute("class", "rename-overlay");
        renameOverlay.setAttribute("id", "rename-overlay");

        // positions overlay directly on top of document-item being renamed
        renameOverlay.setAttribute("style", `
            top: ${position.top}; 
            left: ${position.left};
            height: ${position.height};         
        `);

        // rename submit event handler
        renameOverlay.addEventListener("submit", (e) => {
            e.preventDefault(); //prevents page reload on submit (default submit behvaior)

            let currDisplayName = document.getElementById("document-item-"+id).value;
            let newDisplayName = document.getElementById("rename-input").value;
            // unrenders rename-overlay
            document.getElementById("rename-overlay").remove();

            // TODO this is where we could sanitize user input for rename (maybe we dont want to tho?)
            if(currDisplayName == newDisplayName || newDisplayName == ""){
                return;
            }

            // gets the path to the current document view
            let dirPath = document.getElementById("directory-name").getAttribute("data-folderPath");

            // rename document only if new name is unique in the current folder/directory
            if(XML.uniqueDocumentName(newDisplayName, dirPath)){
                // renames this document within the XML structure file
                XML.renameXMLDocument(newDisplayName, documentPath);

                // changes display name of rendered document-item
                let documentItem = document.getElementById("document-item-"+id);
                documentItem.setAttribute("value", newDisplayName);

                // changes display name of this document's tab-item (if rendered)
                let tabItem = document.getElementById("tab-item-"+id);
                if(tabItem){
                    tabItem.firstChild.setAttribute("value", newDisplayName);
                }
            } else{
                // generates an operation denied message
                ipcRenderer.send("operation-denied-window", ["document", newDisplayName]);
            }
        }, { once: true });

        // creating rename-overlay inner elements
        // inner element 1: rename text input
        let renameInput = document.createElement("input");
        renameInput.setAttribute("class", "rename-input");
        renameInput.setAttribute("id", "rename-input");
        renameInput.setAttribute("type", "text");
        renameInput.addEventListener("focusout", (e) => {
            // dispatchs submit event to rename event handler
            renameOverlay.dispatchEvent(new Event("submit"));
        });
        // displays current document-item name as default in rename input
        let displayName = document.getElementById("document-item-"+id).value;
        renameInput.setAttribute("value", displayName);

        // inner element 2: submit input (on enter key)
        let renameSubmit = document.createElement("input");
        renameSubmit.setAttribute("type", "submit");
        renameSubmit.setAttribute("hidden", true);

        // appending inner rename-overlay elements          
        renameOverlay.appendChild(renameInput);
        renameOverlay.appendChild(renameSubmit);

        // appends rename-overlay to document body
        document.body.appendChild(renameOverlay);

        // sets focus to rename input field and starts keyboard input at end of current display name value
        renameInput.focus();
        renameInput.setSelectionRange(displayName.length, displayName.length);

    });
}

// delete document context menu handler
function addDeleteDocumentHandler(deleteBtn, id, documentPath){
    deleteBtn.addEventListener("click", (e) => {
        let displayName = document.getElementById("document-item-"+id).value;

        // generates delete warning prompt to user 
        ipcRenderer.send("delete-warning-window", ["document", displayName]);

        ipcRenderer.once("delete-warning-response", (event, res) => {
            if(res){
                // deletes this document and all of its contents from WebScrapBook/data directory
                fs.rmdir(documentPath, { recursive: true }, () => {
                    //console.log("Deleted document at: "+documentPath);
                });

                // removes this document from the XML structure file (from the current folder/directory)
                let dirPath = document.getElementById("directory-name").getAttribute("data-folderpath");
                XML.deleteXMLDocument(documentPath, dirPath)
                
                // unrenders this document item
                let documentItem = document.getElementById("document-item-"+id);
                documentItem.remove();

                // unrenders this document's tab-item (if exists)
                let tabItem = document.getElementById("tab-item-"+id);
                if(tabItem){
                    closeTab(tabItem);
                }
            }
        });
    });
}

class FolderContextMenuItem {
    constructor(name){
        this.element = document.createElement("div");

        // contextmenu-item identifier attributes
        this.element.setAttribute("class", "contextmenu-item");
        this.element.setAttribute("id", "contextmenu-item");

        // creating inner contextmenu-item elements
        // contextmenu-item rename button
        let renameBtn = document.createElement("input");
        renameBtn.setAttribute("class", "contextmenu-btn");
        renameBtn.setAttribute("type", "button");
        renameBtn.setAttribute("value", "Rename");
        // rename onclick event handler
        addRenameFolderHandler(renameBtn, name);

        // contextmenu-item delete button
        let deleteBtn = document.createElement("input");
        deleteBtn.setAttribute("class", "contextmenu-btn");
        deleteBtn.setAttribute("type", "button");
        deleteBtn.setAttribute("value", "Delete");
        // delete onclick event handler
        addDeleteFolderHandler(deleteBtn, name);

        // appending inner contextmenu-item elements
        this.element.appendChild(renameBtn);
        this.element.appendChild(deleteBtn);
    }
}

// rename folder context menu handler
function addRenameFolderHandler(renameBtn, name){
    renameBtn.addEventListener("click", (e) => {
        // gets the position of this folder-item
        let position = document.getElementById("folder-item-"+name).getBoundingClientRect();
 
        // creates rename overlay item
        let renameOverlay = document.createElement("form");

        // rename-overlay identifier attributes
        renameOverlay.setAttribute("class", "rename-overlay");
        renameOverlay.setAttribute("id", "rename-overlay");

        // positions overlay directly on top of folder-item being renamed
        renameOverlay.setAttribute("style", `
            top: ${position.top}; 
            left: ${position.left};
            height: ${position.height};
        `);

        // rename submit event handler
        renameOverlay.addEventListener("submit", (e) => {
            e.preventDefault(); //prevents page reload on submit (default submit behvaior)

            let currDisplayName = document.getElementById("folder-item-"+name).value;
            let newDisplayName = document.getElementById("rename-input").value;

            // unrenders rename-overlay
            document.getElementById("rename-overlay").remove();

            // TODO this is where we could sanitize user input for rename (maybe we dont want to tho?)
            if(currDisplayName == newDisplayName || newDisplayName == ""){
                return;
            }

            // gets the path to the current document view
            let dirPath = document.getElementById("directory-name").getAttribute("data-folderPath");

            // rename folder only if new name is unique in this folder
            if(XML.uniqueFolderName(newDisplayName, dirPath)){
                let currFolderPath = path.join(dirPath, currDisplayName);
                // renames this folder within the XML structure file (and updates any document/folder that references this folder path)
                XML.renameXMLFolder(currDisplayName, newDisplayName, currFolderPath);

                // changes display name of rendered folder-item
                let folderItem = document.getElementById("folder-item-"+name);
                folderItem.setAttribute("value", newDisplayName);

                // updates data-folderpath attribute for this folder
                let newFolderPath = path.join(dirPath, newDisplayName);
                folderItem.setAttribute("data-folderpath", newFolderPath);
            } else{
                // generates an operation denied message
                ipcRenderer.send("operation-denied-window", ["folder", newDisplayName]);
            }
        }, { once: true });

        // creating rename-overlay inner elements
        // inner element 1: rename text input
        let renameInput = document.createElement("input");
        renameInput.setAttribute("class", "rename-input");
        renameInput.setAttribute("id", "rename-input");
        renameInput.setAttribute("type", "text");
        renameInput.addEventListener("focusout", (e) => {
            // dispatchs submit event to rename event handler
            renameOverlay.dispatchEvent(new Event("submit"));
        });
        // displays current folder-item name
        let displayName = document.getElementById("folder-item-"+name).value;
        renameInput.setAttribute("value", displayName);

        // inner element 2: submit input (on enter key)
        let renameSubmit = document.createElement("input");
        renameSubmit.setAttribute("type", "submit");
        renameSubmit.setAttribute("hidden", true);

        // appending inner rename-overlay elements          
        renameOverlay.appendChild(renameInput);
        renameOverlay.appendChild(renameSubmit);

        // appends rename-overlay to document body
        document.body.appendChild(renameOverlay);

        // sets focus to rename input field and starts keyboard input at end of current name value
        renameInput.focus();
        renameInput.setSelectionRange(displayName.length, displayName.length);

    });
}

// delete folder context menu handler
function addDeleteFolderHandler(deleteBtn, name){
    deleteBtn.addEventListener("click", (e) => {
        // gets the path to the current document view
        let dirPath = document.getElementById("directory-name").getAttribute("data-folderPath");
        let folderName = document.getElementById("folder-item-"+name).value;
        let folderPath = path.join(dirPath, folderName);

        ipcRenderer.send("delete-warning-window", ["folder", folderName]);

        ipcRenderer.once("delete-warning-response", (event, res) => {
            if(res){
                // gets all documents contained within this folder (and any subfolder)
                let documents = XML.getFolderDocuments(folderPath);
                for(let i = 0; i < documents.length; i++){
                    // returns an array containing each documents id and documentPath
                    let documentIdentifiers = documents[i];
                    let id = documentIdentifiers[0];
                    let documentPath = documentIdentifiers[1];

                    // deletes this document and all of its contents from WebScrapBook/data directory
                    fs.rmdir(documentPath, { recursive: true }, () => {
                        //console.log("Deleted document at: "+documentPath);
                    });

                    // unrenders this document's tab-item (if exists)
                    let tabItem = document.getElementById("tab-item-"+id);
                    if(tabItem){
                        closeTab(tabItem);
                    }
                }

                // deletes this folder and all of its contents from the XML structure file
                XML.deleteXMLFolder(folderName, dirPath);

                // unrenders this folder item
                let folderItem = document.getElementById("folder-item-"+name);
                folderItem.remove();
            }
        });
    });
}

module.exports = { DocumentContextMenuItem, FolderContextMenuItem }