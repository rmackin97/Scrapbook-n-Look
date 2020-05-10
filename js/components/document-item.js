"use strict";

const XML = require("../xml-builder");
const path = require("path");

class DocumentItem {
    // id and documentPath for a document will never change
    // displayName can change by the user via rename context menu operation
    constructor(id, displayName, documentPath, search = false){
        const render = require("../render");
        let srcPath = path.join(documentPath, "index.html");

        // this.element = document.createElement("input");
        this.element = document.createElement("input");

        // document-item identifier attributes
        this.element.setAttribute("class", "document-item");
        this.element.setAttribute("id", "document-item-"+id);

        this.element.setAttribute("type", "button");
        this.element.setAttribute("value", displayName);
        // this.element.innerHTML = displayName;

        // event handlers
        // click handling
        this.element.addEventListener("click", (e) => {
            // creates a webpage view of this document
            let webpageItem = document.getElementById('webpage-item');
            webpageItem.setAttribute("src", srcPath);

            // renders a tab for this document
            render.renderTab(id, srcPath);

            // updates date last viewed metadata value
            XML.updateDateLastViewed(documentPath);

            if(search){
                document.getElementById("search-input").value = "";
                
                let currFolderPath = document.getElementById("directory-name").getAttribute("data-folderpath");
                render.flushDocumentView();
                render.renderDocumentView(currFolderPath);
            }
        });
        
        // allow context menu options and drag & drop only if this is not a document search view
        if(!search){
            // right click context menu handling
            this.element.addEventListener("contextmenu", (e) => {
                // renders a contextmenu for this document (x and y are mouse coordinates)
                render.renderDocumentContextmenu(id, documentPath, e.x, e.y);
            });

            // drag and drop handling
            this.element.setAttribute("draggable", true);
            this.element.addEventListener("dragstart", (e) => {
                // gets the path to the current document view
                const folderPath = document.getElementById("directory-name").getAttribute("data-folderpath");
            
                // current directory folder path
                e.dataTransfer.setData("dirFolderPath", folderPath);

                // indicates this draggable object as a document
                e.dataTransfer.setData("type", "document");

                // gets the current display name for this document
                let displayName = document.getElementById("document-item-"+id).value;

                // document specific data
                e.dataTransfer.setData("displayName", displayName);
                e.dataTransfer.setData("documentPath", documentPath);
                
                e.dataTransfer.dropEffect = "move";
            });
        }
    }
}

module.exports = { DocumentItem }