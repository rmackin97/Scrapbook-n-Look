"use strict";

const { ipcRenderer } = require("electron");

const XML = require("../xml-builder");

class FolderItem{
    constructor(name, folderPath){
        this.element = document.createElement("input");

        // folder-item identifier attributes
        this.element.setAttribute("class", "folder-item");
        this.element.setAttribute("id", "folder-item-"+name);

        // folder-item custom folderPath attribute
        this.element.setAttribute("data-folderpath", folderPath);

        this.element.setAttribute("type", "button");
        this.element.setAttribute("value", name);

        // event handlers
        // double click handling
        this.element.addEventListener("dblclick", (e) => {
            // gets the current folder path for this folder
            let currFolderPath = document.getElementById("folder-item-"+name).getAttribute("data-folderpath");

            // flushes the current document view and renders the selected folder
            const render = require("../render");
            render.flushDocumentView();
            render.renderDocumentView(currFolderPath);
        });

        // right click context menu handling
        this.element.addEventListener("contextmenu", (e) => {
            // renders a contextmenu for this document (x and y are mouse coordinates)
            require("../render").renderFolderContextmenu(name, e.x, e.y);
        });

        // drag and drop handling
        this.element.setAttribute("draggable", true);
        this.element.addEventListener("dragstart", (e) => {
            // gets the path to the current document view
            const dirPath = document.getElementById("directory-name").getAttribute("data-folderpath");
        
            // current directory folder path
            e.dataTransfer.setData("dirFolderPath", dirPath);

            // indicates this draggable object as a folder
            e.dataTransfer.setData("type", "folder");

            // gets the current name and folder path for this folder
            let folderName = document.getElementById("folder-item-"+name).value;
            let path = document.getElementById("folder-item-"+name).getAttribute("data-folderpath");

            // document specific data
            e.dataTransfer.setData("name", folderName);
            e.dataTransfer.setData("folderPath", path);
            
            e.dataTransfer.dropEffect = "move";
        });
        this.element.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
        });
        this.element.addEventListener("drop", (e) => {
            e.preventDefault();
            let type = e.dataTransfer.getData("type");

            // handle document drop
            if(type == "document"){
                // folder path of the target folder
                let targetFolderPath = document.getElementById("folder-item-"+name).getAttribute("data-folderpath");
                // current folder path containing this document
                let dirFolderPath = e.dataTransfer.getData("dirFolderPath");

                // document specific data
                let displayName = e.dataTransfer.getData("displayName");
                let documentPath = e.dataTransfer.getData("documentPath");

                if(XML.moveXMLDocument(targetFolderPath, dirFolderPath, documentPath)){
                    // event flushes current document view and renders this folder's document view
                    this.element.dispatchEvent(new Event("dblclick"));
                } else{
                    // generates an operation denied message
                    ipcRenderer.send("operation-denied-window", ["document", displayName]);
                }
            } 
            // handle folder drop
            else{
                let targetFolderPath = document.getElementById("folder-item-"+name).getAttribute("data-folderpath");
                let dirFolderPath = e.dataTransfer.getData("dirFolderPath");
                let path = e.dataTransfer.getData("folderPath");

                // ensures that you cannot drop this folder on itself
                if(targetFolderPath != path){
                    if(XML.moveXMLFolder(targetFolderPath, dirFolderPath, path)){
                        // event flushes current document view and renders this folder's document view
                        this.element.dispatchEvent(new Event("dblclick"));
                    } else{
                        // generates an operation denied message
                        ipcRenderer.send("operation-denied-window", ["folder", e.dataTransfer.getData("name")]);
                    }
                }
            }
        });
    }
}

// "Back" button drop handler
function backDropHandler(backBtn){
    backBtn.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    });
    backBtn.addEventListener("drop", (e) => {
        e.preventDefault();
        let type = e.dataTransfer.getData("type");

        // handle document drop
        if(type == "document"){
            // folder path of the target folder (the parent folder)
            let targetFolderPath = document.getElementById("directory-name").getAttribute("data-folderpath");
            targetFolderPath = targetFolderPath.split("/");
            targetFolderPath.pop(); // removes the current directory from the folder path
            targetFolderPath = targetFolderPath.join("/");

            // current folder path containing this document
            let dirFolderPath = e.dataTransfer.getData("dirFolderPath");

            // document specific data
            let displayName = e.dataTransfer.getData("displayName");
            let documentPath = e.dataTransfer.getData("documentPath");

            console.log("moving document to "+targetFolderPath);
            console.log("deleting document from "+dirFolderPath);
            if(XML.moveXMLDocument(targetFolderPath, dirFolderPath, documentPath)){
                // flushes current document view and renders the previous folder's document view
                renderPrevDocumentView();
            } else{
                // generates an operation denied message
                ipcRenderer.send("operation-denied-window", ["document", displayName]);
            }
        }
        // handle folder drop 
        else{
            // folder path of the target folder (the parent folder)
            let targetFolderPath = document.getElementById("directory-name").getAttribute("data-folderpath");
            targetFolderPath = targetFolderPath.split("/");
            targetFolderPath.pop(); // removes the current directory from the folder path
            targetFolderPath = targetFolderPath.join("/");

            let dirFolderPath = e.dataTransfer.getData("dirFolderPath");
            let path = e.dataTransfer.getData("folderPath");

            // ensures that you cannot drop this folder on itself
            if(targetFolderPath != path){
                if(XML.moveXMLFolder(targetFolderPath, dirFolderPath, path)){
                    // flushes current document view and renders the previous folder's document view
                    renderPrevDocumentView();
                } else{
                    // generates an operation denied message
                    ipcRenderer.send("operation-denied-window", ["folder", e.dataTransfer.getData("name")]);
                }
            }
        }
    });
}

module.exports = { FolderItem, backDropHandler }