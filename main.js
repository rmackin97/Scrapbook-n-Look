"use strict";

const { app, BrowserWindow, Menu, shell, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

// application windows
let mainWindow = null;
let promptWindow = null;

// listen for app to be ready
app.once("ready", () => {
    console.log("Application starting...");

    // creates the browser window
    mainWindow  = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 600,
        minHeight: 400,
        webPreferences: {
            nodeIntegration: true,
            webviewTag: true
        }
    });

    // mounts application resource requirements
    console.log("Mounting application resources...");
    require("./js/mount-app")();

    // load index.html
    console.log("Rendering application...")
    mainWindow.loadFile("./web/index.html");

    // build menu from template
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    // insert menu
    Menu.setApplicationMenu(mainMenu);

    // opens devtools for testing purposes
    // mainWindow.webContents.openDevTools();

    mainWindow.on("closed", () => {
        mainWindow  = null;
    });
});

// todo event description and trigger
ipcMain.on("new-folder-window", (event, args) => {
    promptWindow = new BrowserWindow({
        width: 275, height: 150,
        minWidth: 275, minHeight: 150,
        modal: true,
        parent: mainWindow,
        webPreferences: {
            nodeIntegration: true
        }
    });

    promptWindow.loadFile("./web/new-folder.html");

    promptWindow.on("closed", () => {
        promptWindow = null;
    });
});


ipcMain.on("new-folder-response", (event, res) => {
    // closes the prompt window
    promptWindow.close();

    // sends new folder name to main application window
    mainWindow.webContents.send("new-folder-response", res);
});

ipcMain.on("search-options-window", (event, args) => {
    promptWindow = new BrowserWindow({
        width: 275, height: 275,
        minWidth: 275, minHeight: 275,
        modal: true,
        parent: mainWindow,
        webPreferences: {
            nodeIntegration: true
        }
    });

    promptWindow.loadFile("./web/search-options.html", {query: {"searchLocation": args[0], "searchDate": args[1]}});

    promptWindow.on("closed", () => {
        promptWindow = null;
    });
});

ipcMain.on("search-options-response", (event, res) => {
    // closes the prompt window
    promptWindow.close();

    // sends updated search options to main application window
    mainWindow.send("search-options-response", res);
});

ipcMain.on("delete-warning-window", (event, args) => {
    promptWindow = new BrowserWindow({
        width: 275, height: 150,
        minWidth: 275, minHeight: 150,
        modal: true,
        parent: mainWindow,
        webPreferences: {
            nodeIntegration: true
        }
    });

    promptWindow.loadFile("./web/delete-warning.html", {query: {"type": args[0], "name": args[1]}});

    promptWindow.on("closed", () => {
        promptWindow = null;
    });
});

ipcMain.on("delete-warning-response", (event, res) => {
    // closes the prompt window
    promptWindow.close();

    // sends response to main application window
    mainWindow.webContents.send("delete-warning-response", res);
});

ipcMain.on("operation-denied-window", (event, args) => {
    promptWindow = new BrowserWindow({
        width: 275, height: 150,
        minWidth: 275, minHeight: 150,
        modal: true,
        parent: mainWindow,
        webPreferences: {
            nodeIntegration: true
        }
    });

    promptWindow.loadFile("./web/operation-denied.html", {query: {"type": args[0], "name": args[1]}});

    promptWindow.on("closed", () => {
        promptWindow = null;
    });
});

ipcMain.on("operation-denied-response", (event, res) => {
    // closes the prompt window
    promptWindow.close();
});

// ensures that all links clicked from within the rendered document load in the user's default browser
app.on("web-contents-created", (event, contents) => {
    if(contents.getType() === "webview"){
        contents.on("will-navigate", (event, url) => {
            event.preventDefault();
            shell.openExternal(url);
        });
    }
});

// quit when all windows are closed
app.on("window-all-closed", () => {
    if(process.platform != "darwin"){
        app.quit();
    }
});

// application menu
const mainMenuTemplate = [
    {
        label: "File",
        submenu: [
            {
                label: "Quit",
                click(){
                    app.quit();
                }
            }
        ]
    },
    {
        label: "View",
        submenu: [
            {
                label: "Reload",
                click(){
                    // updates/mounts (if missing) all application resources
                    console.log("Reloading...");
                    require("./js/mount-app")();
                    mainWindow.loadFile("./web/index.html");
                }
            }
        ]
    }
];

// if on mac, add empty object to menu (this helps formatting the menu)
if(process.platform == "darwin"){
    mainMenuTemplate.unshift({label: ""});
}