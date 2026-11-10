
// core.js — DESU response utilities
(function () {
    "use strict";

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    function normalizeSources(input) {
        if (!Array.isArray(input)) return [];

        const seen = new Set();

        return input.slice(0, 5).filter(source => {
            if (!source || typeof source.url !== "string") return false;

            try {
                const url = new URL(source.url);

                if (!["https:", "http:"].includes(url.protocol)) return false;
                if (seen.has(url.href)) return false;

                seen.add(url.href);
                return true;
            } catch {
                return false;
            }
        }).map(source => {
            const url = new URL(source.url);

            return {
                title: String(source.title || url.hostname).slice(0, 60),
                url: url.href,
                domain: url.hostname
            };
        });
    }

    function createSourceBar(input) {
        const sources = normalizeSources(input);

        if (!sources.length) return null;

        const bar = document.createElement("div");
        bar.className = "desu-source-bar";

        const label = document.createElement("span");
        label.className = "desu-source-label";
        label.textContent = "Sources";

        bar.appendChild(label);

        sources.forEach(source => {
            const link = document.createElement("a");
            link.className = "desu-source-chip";
            link.href = source.url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.title = "Open " + source.title;

            const logo = document.createElement("img");
            logo.src =
                "https://www.google.com/s2/favicons?domain=" +
                encodeURIComponent(source.domain) + "&sz=32";
            logo.alt = "";
            logo.width = 16;
            logo.height = 16;
            logo.loading = "lazy";

            const name = document.createElement("span");
            name.textContent = source.title;

            link.append(logo, name);
            bar.appendChild(link);
        });

        return bar;
    }

    function createFollowUp(input) {
        if (typeof input !== "string") return null;

        const topic = input.trim().slice(0, 180);
        if (!topic) return null;

        const element = document.createElement("div");
        element.className = "desu-follow-up";
        element.textContent = "Would you like to explore " + topic + "?";

        return element;
    }

    window.DESUCore = {
        normalizeSources,
        createSourceBar,
        createFollowUp,
        escapeHTML
    };
})();
