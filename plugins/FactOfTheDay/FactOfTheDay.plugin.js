/**
 * @name FactOfTheDay
 * @author Nyx & Xenon Colt
 * @authorId 270848136006729728
 * @version 2.0.1
 * @license MIT
 * @description Gives you a (useless) random fact, or quote of the day each time you login to discord.
 * @website https://www.nyxgoddess.org/
 * @source https://raw.githubusercontent.com/SrS2225a/BetterDiscord/master/plugins/FactOfTheDay/FactOfTheDay.plugin.js
 * @updateUrl https://raw.githubusercontent.com/SrS2225a/BetterDiscord/master/plugins/FactOfTheDay/FactOfTheDay.plugin.js
 */

const config = {
    main: "FactOfTheDay.plugin.js",
    authorId: "270848136006729728",
    contributors: [
        {
            name: "Xenon Colt",
            discord_id: "709210314230726776",
            github_username: "xenoncolt",
        }
    ],
    info: {
        name: "FactOfTheDay",
        authors: [
            {
                name: "Nyx & Xenon Colt",
                github_username: "SrS2225a",
                link: "https://github.com/SrS2225a"
            }
        ],
        version: "2.0.1",
        description: "Gives you a (useless) random fact, or quote of the day each time you login to discord.",
        github_raw: "https://raw.githubusercontent.com/SrS2225a/BetterDiscord/master/plugins/FactOfTheDay/FactOfTheDay.plugin.js"
    },
    changelog: [
        {
            title: "New Features & Improvements",
            type: "added",
            items: [
                "Refactor the plugin structure",
                "Now fact and quote will be shown in a notice",
                "Refactor request handling to use BdApi.Net.fetch",
            ]
        },
        {
            title: "Fixed Few Things",
            type: "fixed",
            items: [
                "Fixed a description typo",
                "Fixed daily request logic to properly respect the \"Daily Requests\" setting",
            ]
        },
        // {
        //     title: "Changed Few Things",
        //     type: "changed",
        //     items: [
        //         "To avoid CORs issues, use `BdApi.Net.fetch` instead of `request`",
        //     ]
        // }
    ],
    settingsPanel: [
        {
            type: "switch",
            id: "dailyRequests",
            name: "Daily Requests",
            note: "When enabled, the plugin will only get a new fact of the day once a day. When disabled, it will get a new fact of the day every time you login.",
            value: true
        },
        {
            type: "radio",
            id: "requestsType",
            name: "Request Type",
            options: [
                { name: "Fact", value: "fact" },
                { name: "Quote", value: "quote" },
            ],
            note: "Choose the category of the daily message",
            value: "fact"
        }
    ]
};

let defaultSettings = {
    dailyRequests: true,
    requestsType: "fact",
}

const { Webpack, UI, Logger, Data, Utils, Net } = BdApi;

class FactOfTheDay {
    constructor() {
        this._config = config;

        this.settings = Data.load(this._config.info.name, "settings");

    }

    start() {
        this.settings = Data.load(this._config.info.name, "settings") || defaultSettings;

        if (Data.load(this._config.info.name, "settings") == null) this.saveAndUpdate();

        this.checkForChangelog();

        if (!this.settings.dailyRequests) {
            this.createRequest();
        } else {
            const lastRequest = Data.load(this._config.info.name, "lastRequest") || 0;
            const oneDayInMs = 24 * 60 * 60 * 1000;
            
            if (lastRequest === 0 || (Date.now() - lastRequest) > oneDayInMs) {
                this.createRequest();

                Data.save(this._config.info.name, "lastRequest", Date.now());
            } else {
                Logger.log(this._config.info.name, `Skipping daily request, already shown today.`);
            }
        }
    }

    stop() {

    }

    getSettingsPanel() {
        for (const setting of this._config.settingsPanel) {
            if (this.settings[setting.id] !== undefined) {
                setting.value = this.settings[setting.id];
            }
        }

        return UI.buildSettingsPanel({
            settings: this._config.settingsPanel,
            onChange: (category, id, value) => {
                this.settings[id] = value;
                this.saveAndUpdate();
            },
        })
    }

    saveAndUpdate() {
        Data.save(this._config.info.name, "settings", this.settings);
    }

    createRequest() {
        const requestType = this.settings.requestsType;
        const isQuote = requestType === "quote";
        const endPoint = isQuote ? "random-quotes" : "random-facts";

        Net.fetch(`https://fenriris.net/api/${endPoint}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            timeout: 5000,
        }).then(response => {
            if (!response.ok) throw new Error(`Http Error: ${response.status}`);
            return response.json();
        }).then(responseData => {
            Logger.log(this._config.info.name, `Fetched ${requestType}:`, responseData);
            
            // I have a another plan in my mind for this, but for now, let's just make it simple using notice;
            // let title = isQuote ? "Quote of the Day" : "Fact of the Day";
            let content = isQuote ? `📜 Quote: "${responseData.quote}" - ${responseData.author}` : `🔍 Fact: ${responseData.fact} - ${responseData.source}`;

            UI.showNotice(content, {
                type: "info",
                timeout: 5 * 60 * 1000
            });

            // FOR FUTURE USE
            // UI.showNotification({
            //     id: this._config.info.name,
            //     content: content,
            //     type: "info",
            //     duration: Infinity,
            //     actions: [
            //         {
            //             label: "Close",
            //         }
            //     ]
            // });
        }).catch(err => {
            Logger.error(this._config.info.name, `Error fetching ${requestType}:`, err);
            UI.showToast(`Error fetching ${requestType}`, { type: "error" });
        });
    }

    checkForChangelog() {
        try {
            let currentVersionInfo = {};
            try {
                currentVersionInfo = Object.assign({}, { version: this._config.info.version, hasShownChangelog: false }, Data.load(this._config.info.name, "currentVersionInfo"));
            } catch (err) {
                currentVersionInfo = { version: this._config.info.version, hasShownChangelog: false };
            }
            if (this._config.info.version != currentVersionInfo.version) currentVersionInfo.hasShownChangelog = false;
            currentVersionInfo.version = this._config.info.version;
            Data.save(this._config.info.name, "currentVersionInfo", currentVersionInfo);

            if (!currentVersionInfo.hasShownChangelog) {
                UI.showChangelogModal({
                    title: "FactOfTheDay Changelog",
                    subtitle: this._config.info.version,
                    changes: this._config.changelog
                });
                currentVersionInfo.hasShownChangelog = true;
                Data.save(this._config.info.name, "currentVersionInfo", currentVersionInfo);
            }
        }
        catch (err) {
            Logger.error(this._config.info.name, err);
        }
    }
}

module.exports = FactOfTheDay;
