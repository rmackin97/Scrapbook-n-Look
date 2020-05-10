"use strict";

// tab counter
let tab_cnt = 0;

class TabItem {
    constructor(id, srcPath){
        tab_cnt++;

        this.element = document.createElement("div");

        // tab-item identifier attributes
        this.element.setAttribute("class", "tab-item");
        this.element.setAttribute("id", "tab-item-"+id);

        // tab-item ordering attributes
        this.element.setAttribute("order", tab_cnt);
        this.element.setAttribute("style", "order: "+tab_cnt);

        // tab-item custom path attribute
        this.element.setAttribute("data-srcpath", srcPath);
        unselectTabs(); // unselects all tabs
        this.element.setAttribute("data-selected", true);

        // creating inner tab-item elements
        // inner element 1: close button
        let closeBtn = document.createElement("input");
        closeBtn.setAttribute("class", "tab-btn-close"); 
        closeBtn.setAttribute("type", "button");
        // close onclick event handler
        closeBtn.addEventListener("click", (e) => {
            let tabItem = document.getElementById("tab-item-"+id);
            closeTab(tabItem);
        });
        closeBtn.setAttribute("value", "X");

        // inner element 2: view button
        let viewBtn = document.createElement("input");
        viewBtn.setAttribute("class", "tab-btn-view"); 
        viewBtn.setAttribute("type", "button");
        // view onclick event handler
        viewBtn.addEventListener("click", (e) => {
            let tabItem = document.getElementById("tab-item-"+id);
            unselectTabs(); // unselects all tabs
            tabItem.setAttribute("data-selected", true);
            // creates a webpage view of this document
            let webview = document.getElementById('webpage-item');
            webview.setAttribute("src", srcPath);
        });
        let name = document.getElementById("document-item-"+id).getAttribute("value");
        viewBtn.setAttribute("value", name);

        // appending inner tab-item elements
        this.element.appendChild(viewBtn);
        this.element.appendChild(closeBtn);
    }
}

// tab closing logic
function closeTab(tabItem){
    // position (in tab bar) and src of deleted tab-item
    let position = tabItem.getAttribute("order");
    let srcPath = tabItem.getAttribute("data-srcpath").replace(/\\/g, "/");

    // closes this tab-item and decrements tab count
    tabItem.remove();
    tab_cnt--;

    const tabContainer = document.getElementById("tab-container");
    let webpageItem = document.getElementById("webpage-item");

    // changeView is true if the closed tab-item is also the current webpage view that is in focus
    let changeView = false;
    if(webpageItem.getAttribute("src").includes(srcPath)){
        changeView = true;
    }
    if(tab_cnt != 0){
        tabContainer.childNodes.forEach(tabItem => {
            // tabs current order (position) within the tab bar
            let order = tabItem.getAttribute("order");
     
            // sets webpage-item view to the src of the tab to the immediate left of the closed tab
            if(changeView && order == position - 1){
                // sets this new tab as the selected tab
                tabItem.setAttribute("data-selected", true);

                const srcPath = tabItem.getAttribute("data-srcpath");
                webpageItem.setAttribute("src", srcPath);
            } 
            // if the closed tab was the first tab then the view changes to the src of the tab to the immediate right
            else if(changeView && position == 1 && order == 2){
                // sets this new tab as the selected tab
                tabItem.setAttribute("data-selected", true);

                const srcPath = tabItem.getAttribute("data-srcpath");
                webpageItem.setAttribute("src", srcPath);
            }

            // shifts the order of all tab positions one to the left
            order--;
            // adjusts tab-item ordering attributes to account for closed tab (if affected)
            if(order >= position){    
                tabItem.setAttribute("order", order);
                tabItem.setAttribute("style", "order: "+order);
            }
        });
    } 
    // default view applied when all tabs are closed
    else{
        webpageItem.setAttribute("src", "../web/default-view.html");
    }
}

function unselectTabs(){
    let tabs = document.getElementsByClassName("tab-item");
    for(let i = 0; i < tabs.length; i++){
        tabs[i].setAttribute("data-selected", false);
    }
}

module.exports = { TabItem, closeTab }