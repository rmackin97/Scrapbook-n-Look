"use strict";

/**
 * This file contains all search logic. Renderer will render found documents under a search view.
 * If this could be dynamically done on user input into the search bar that would be amazing.
 */

const render = require("./render");

// used to communicate between this process and the main.js application process
const { ipcRenderer } = require("electron");
// used to parse the structure.xml file
const cheerio = require("cheerio");

const path = require("path");
const fs = require("fs");

const downloadsFolder = require("downloads-folder");
const xmlPath = path.join(downloadsFolder(), "WebScrapBook/.structure.xml");

// search logic handler
function searchHandler(searchBar){
    searchBar.addEventListener("submit", (e) =>{
        e.preventDefault();
        // user search query
        let input = document.getElementById("search-input").value;
        if(input.length == 0){
            return;
        }
        // array of resulting documents that match this search query
        let documents;
        
        let filters = getSearchFilters();
        let searchBy = filters[0];
        let searchLocation = filters[1];
        let searchDate = filters[2];

        if(searchBy == "title"){
            documents = searchByTitle(input, searchLocation, searchDate);
        } else if(searchBy == "tag"){
            documents = searchByTag(input, searchLocation, searchDate);
        }

        // renders all resulting documents
        render.renderSearchDocumentView(documents);
    });
}

// returns an array of seach filters (search by, search location, date last viewed)
// default filters are the following: 
// search by --> title, search location --> all subfolders, date last viewed --> all time
function getSearchFilters(){
    let filters = [];

    let searchBy = document.getElementById("search-by");
    if(searchBy.selectedIndex != 0){
        filters[0] = searchBy.options[searchBy.selectedIndex].id;
    } else{
        filters[0] = "title"; // default value
    }

    let searchOptions = document.getElementById("search-options");
    filters[1] = searchOptions.getAttribute("data-searchlocation");
    filters[2] = searchOptions.getAttribute("data-searchdate");

    return filters;
}

function searchByTitle(input, location, date){
    const data = fs.readFileSync(xmlPath);
    const $ = cheerio.load(data, { xmlMode: true });

    let documents = [];
    
    // search query on all documents
    if(location == "all-documents"){
        $("Root").find("Document").each((i, document) => {
            let metadata = $(document).children("Metadata");
            
            if($(metadata).attr("title").toLowerCase().includes(input.toLowerCase()) &&
            inDateRange(date, $(metadata).attr("dateLastViewed"))){
                documents.push(document);
            }
        });
    }
    // search query on current folder documents
    else if(location == "current-folder"){
        let currFolderPath = document.getElementById("directory-name").getAttribute("data-folderpath");

        $("Root").find("Document").each((i, document) => {
            let metadata = $(document).children("Metadata");

            if($(document).attr("folderPath") == currFolderPath &&
            $(metadata).attr("title").toLowerCase().includes(input.toLowerCase()) &&
            inDateRange(date, $(metadata).attr("dateLastViewed"))){
                documents.push(document);
            }
        });
    }
    // search query on current folder and all subfolder documents
    else if(location == "all-subfolders"){
        let currFolderPath = document.getElementById("directory-name").getAttribute("data-folderpath");

        $("Root").find("Document").each((i, document) => {
            let metadata = $(document).children("Metadata");

            if($(document).attr("folderPath").includes(currFolderPath) &&
            $(metadata).attr("title").toLowerCase().includes(input.toLowerCase()) &&
            inDateRange(date, $(metadata).attr("dateLastViewed"))){
                documents.push(document);
            }
        });
    }

    return documents;
}

function searchByTag(input, location, date){
    const data = fs.readFileSync(xmlPath);
    const $ = cheerio.load(data, { xmlMode: true });

    let documents = [];
    
    // search query on all documents
    if(location == "all-documents"){
        $("Root").find("Document").each((i, document) => {
            let metadata = $(document).children("Metadata");
            let tags = $(metadata).attr("tags");

            if(tags){
                tags = tags.split(";");

                for(let i = 0; i < tags.length; i++){
                    if(tags[i].toLowerCase() == input.toLowerCase() &&
                    inDateRange(date, $(metadata).attr("dateLastViewed"))){
                        documents.push(document);
                        break;
                    }
                }
            }
        });
    }
    // search query on current folder documents
    else if(location == "current-folder"){
        let currFolderPath = document.getElementById("directory-name").getAttribute("data-folderpath");

        $("Root").find("Document").each((i, document) => {
            let metadata = $(document).children("Metadata");
            let tags = $(metadata).attr("tags");

            if(tags){
                tags = tags.split(";");

                for(let i = 0; i < tags.length; i++){
                    if($(document).attr("folderPath") == currFolderPath && 
                    tags[i].toLowerCase() == input.toLowerCase() &&
                    inDateRange(date, $(metadata).attr("dateLastViewed"))){
                        documents.push(document);
                        break;
                    }
                }
            }
        });
    }
    // search query on current folder and all subfolder documents
    else if(location == "all-subfolders"){
        let currFolderPath = document.getElementById("directory-name").getAttribute("data-folderpath");

        $("Root").find("Document").each((i, document) => {
            let metadata = $(document).children("Metadata");
            let tags = $(metadata).attr("tags");

            if(tags){
                tags = tags.split(";");

                for(let i = 0; i < tags.length; i++){
                    if($(document).attr("folderPath").includes(currFolderPath) && 
                    tags[i].toLowerCase() == input.toLowerCase() &&
                    inDateRange(date, $(metadata).attr("dateLastViewed"))){
                        documents.push(document);
                        break;
                    }
                }
            }
        });
    }

    return documents;
}

function inDateRange(searchDate, dateLastViewed){
    // always in date range if search range is all time
    if(searchDate == "all-time"){
        return true;
    } else{
        // if never viewed return false
        if(!dateLastViewed){
            return false;
        } 

        let lastViewed = new Date(dateLastViewed);
        let currDate = new Date();

        // return true or false if the last viewed date is in the specified search range
        if(searchDate == "today"){
            return lastViewed.getDate() == currDate.getDate() ? true : false;
        } else if(searchDate == "this-week"){
            let seconds = (currDate.getTime() - lastViewed.getTime()) / 1000;
            return seconds <= 604800 ? true : false;
        } else if(searchDate == "this-month"){
            return lastViewed.getMonth() == currDate.getMonth() ? true : false;
        } else if(searchDate == "this-year"){
            return lastViewed.getFullYear() == currDate.getFullYear() ? true : false;
        }
    }
}

function openSearchOptions(){
    let searchOptions = document.getElementById("search-options");

    let currentOptions = [];
    currentOptions.push(searchOptions.getAttribute("data-searchlocation"));
    currentOptions.push(searchOptions.getAttribute("data-searchdate"));
    
    ipcRenderer.send("search-options-window", currentOptions);

    ipcRenderer.once("search-options-response", (event, res) => {
        searchOptions.setAttribute("data-searchlocation", res[0]);
        searchOptions.setAttribute("data-searchdate", res[1]);
    });
}





module.exports = { searchHandler, openSearchOptions }