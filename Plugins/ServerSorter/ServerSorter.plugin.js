//META{"name":"ServerSorter","displayName":"ServerSorter","website":"https://github.com/rauenzi/BetterDiscordAddons/tree/master/Plugins/ServerSorter","source":"https://raw.githubusercontent.com/rauenzi/BetterDiscordAddons/master/Plugins/ServerSorter/ServerSorter.plugin.js"}*//
/*@cc_on
@if (@_jscript)
	
	// Offer to self-install for clueless users that try to run this directly.
	var shell = WScript.CreateObject("WScript.Shell");
	var fs = new ActiveXObject("Scripting.FileSystemObject");
	var pathPlugins = shell.ExpandEnvironmentStrings("%APPDATA%\BetterDiscord\plugins");
	var pathSelf = WScript.ScriptFullName;
	// Put the user at ease by addressing them in the first person
	shell.Popup("It looks like you've mistakenly tried to run me directly. \n(Don't do that!)", 0, "I'm a plugin for BetterDiscord", 0x30);
	if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
		shell.Popup("I'm in the correct folder already.", 0, "I'm already installed", 0x40);
	} else if (!fs.FolderExists(pathPlugins)) {
		shell.Popup("I can't find the BetterDiscord plugins folder.\nAre you sure it's even installed?", 0, "Can't install myself", 0x10);
	} else if (shell.Popup("Should I copy myself to BetterDiscord's plugins folder for you?", 0, "Do you need some help?", 0x34) === 6) {
		fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
		// Show the user where to put plugins in the future
		shell.Exec("explorer " + pathPlugins);
		shell.Popup("I'm installed!", 0, "Successfully installed", 0x40);
	}
	WScript.Quit();

@else@*/

var ServerSorter = (() => {
    const config = {"info":{"name":"ServerSorter","authors":[{"name":"Zerebos","discord_id":"249746236008169473","github_username":"rauenzi","twitter_username":"ZackRauen"}],"version":"0.4.2","description":"Adds server sorting abilities to Discord. Support Server: bit.ly/ZeresServer","github":"https://github.com/rauenzi/BetterDiscordAddons/tree/master/Plugins/ServerSorter","github_raw":"https://raw.githubusercontent.com/rauenzi/BetterDiscordAddons/master/Plugins/ServerSorter/ServerSorter.plugin.js"},"changelog":[{"title":"Bugs Squashed","type":"fixed","items":["Button now appears.","Sorting works again."]}],"main":"index.js"};

    return !global.ZeresPluginLibrary ? class {
        constructor() {this._config = config;}
        getName() {return config.info.name;}
        getAuthor() {return config.info.authors.map(a => a.name).join(", ");}
        getDescription() {return config.info.description;}
        getVersion() {return config.info.version;}
        load() {
            const title = "Library Missing";
            const ModalStack = BdApi.findModuleByProps("push", "update", "pop", "popWithKey");
            const TextElement = BdApi.findModuleByProps("Sizes", "Weights");
            const ConfirmationModal = BdApi.findModule(m => m.defaultProps && m.key && m.key() == "confirm-modal");
            if (!ModalStack || !ConfirmationModal || !TextElement) return BdApi.alert(title, `The library plugin needed for ${config.info.name} is missing.<br /><br /> <a href="https://betterdiscord.net/ghdl?url=https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js" target="_blank">Click here to download the library!</a>`);
            ModalStack.push(function(props) {
                return BdApi.React.createElement(ConfirmationModal, Object.assign({
                    header: title,
                    children: [TextElement({color: TextElement.Colors.PRIMARY, children: [`The library plugin needed for ${config.info.name} is missing. Please click Download Now to install it.`]})],
                    red: false,
                    confirmText: "Download Now",
                    cancelText: "Cancel",
                    onConfirm: () => {
                        require("request").get("https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js", async (error, response, body) => {
                            if (error) return require("electron").shell.openExternal("https://betterdiscord.net/ghdl?url=https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js");
                            await new Promise(r => require("fs").writeFile(require("path").join(ContentManager.pluginsFolder, "0PluginLibrary.plugin.js"), body, r));
                        });
                    }
                }, props));
            });
        }
        start() {}
        stop() {}
    } : (([Plugin, Api]) => {
        const plugin = (Plugin, Api) => {
    const {PluginUtilities, ContextMenu, DiscordModules, ReactTools} = Api;

    const SortedGuildStore = DiscordModules.SortedGuildStore;

    return class ServerSearch extends Plugin {
        onStart() {
            PluginUtilities.addStyle(this.getName(), `#sort-options {
	pointer-events: none;
	opacity: 0;
	transition: 300ms cubic-bezier(.2, 0, 0, 1);
	transform-origin: 0 0;
	transform: translateY(-10px);
}

#sort-options.open {
	pointer-events: initial;
	opacity: 1;
	transition: 300ms cubic-bezier(.2, 0, 0, 1);
	transform-origin: 0 0;
	transform: translateY(0px);
}

#sort-button {
	height: 20px;
	overflow: hidden;
}

#sort-button > div {
	border-radius: 0px;
	background-color: rgb(47, 49, 54);
	color: white;
	text-align: center;
	font-size: 12px;
	line-height: 20px;
}`);
            const sortButton = $(`<div class="listItem-2P_4kh" id="sort-button" style="height: 20px; margin-bottom:10px;">
    <div tabindex="0" class="circleButtonMask-2VNJsN wrapper-25eVIn" role="button">
        Sort
    </div>
</div>`);
            const contextMenu = new ContextMenu.Menu().addItems(
                new ContextMenu.ItemGroup().addItems(
                    new ContextMenu.TextItem("Alphabetically", {hint: "A > Z", callback: () => {this.doSort("name", false);}}),
                    new ContextMenu.TextItem("Reverse Alphabetical", {hint: "Z > A", callback: () => {this.doSort("name", true);}})
                ),
                new ContextMenu.ItemGroup().addItems(
                    new ContextMenu.TextItem("Newest Joined", {hint: "New", callback: () => {this.doSort("joinedAt", true);}}),
                    new ContextMenu.TextItem("Oldest Joined", {hint: "Old", callback: () => {this.doSort("joinedAt", false);}})
                ),
                new ContextMenu.ItemGroup().addItems(
                    new ContextMenu.TextItem("Newest Created", {callback: () => {this.doSort("id", true);}}),
                    new ContextMenu.TextItem("Oldest Created", {callback: () => {this.doSort("id", false);}})
                ),
                new ContextMenu.ItemGroup().addItems(
                    new ContextMenu.TextItem("Reset", {danger: true, callback: () => {this.doSort("id", false, true);}})
                )
            );
    
            sortButton.on("click", (e) => {
                contextMenu.show(e.clientX, e.clientY);
            });
            sortButton.insertBefore($(".listItem-2P_4kh .guildSeparator-3s64Iy").first().parent());
        }
        
        onStop() {
            $("#sort-button").remove();
            PluginUtilities.removeStyle(this.getName(), `#sort-options {
	pointer-events: none;
	opacity: 0;
	transition: 300ms cubic-bezier(.2, 0, 0, 1);
	transform-origin: 0 0;
	transform: translateY(-10px);
}

#sort-options.open {
	pointer-events: initial;
	opacity: 1;
	transition: 300ms cubic-bezier(.2, 0, 0, 1);
	transform-origin: 0 0;
	transform: translateY(0px);
}

#sort-button {
	height: 20px;
	overflow: hidden;
}

#sort-button > div {
	border-radius: 0px;
	background-color: rgb(47, 49, 54);
	color: white;
	text-align: center;
	font-size: 12px;
	line-height: 20px;
}`);
        }

        getGuilds() {
            return $(".listItem-2P_4kh:has(.blobContainer-239gwq)");
        }
        
        getGuildData(guild) {
            return ReactTools.getReactProperty(guild, "return.memoizedProps.guild");
        }
        
        getGuildNames() {
            const names = [];
            this.getGuilds().each((index, elem) => {
                names.push(this.getGuildData(elem).name);
            });
            return names;
        }
        
        doSort(sortType, reverse, reset) {
            const guilds = this.getGuilds();
            guilds.sort((a,b) => {
                let first = this.getGuildData(a)[sortType];
                let second = this.getGuildData(b)[sortType];
                
                if (sortType == "id" && !reset) {
                    first = parseInt(first);
                    second = parseInt(second);
                }
    
                if (sortType == "name") {
                    first = first.toLowerCase();
                    second = second.toLowerCase();
                }
                
                if (reset) {
                    first = SortedGuildStore.guildPositions.indexOf(first.toString());
                    second = SortedGuildStore.guildPositions.indexOf(second.toString());
                }
                
                if (first > second) {
                    return reverse ? -1 : 1;
                }
                if (second > first) {
                    return reverse ? 1 : -1;
                }
                return 0;
            });
            guilds.detach().insertBefore($(".listItem-2P_4kh:has([name*=Add])"));
        }

    };
};
        return plugin(Plugin, Api);
    })(global.ZeresPluginLibrary.buildPlugin(config));
})();
/*@end@*/