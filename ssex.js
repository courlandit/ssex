(
    function () {
        const Attributes = Object.freeze({
            CLICK: "sx-click",
            SUBSCRIBE: "sx-subscribe",
            SWAP: "sx-swap",
        });

        const Modes = Object.freeze({
            REPLACE: "replace",
            APPEND: "append",
            PREPEND: "prepend",
        });

        const Positions = Object.freeze({
            START: "afterbegin",
            END: "beforeend",
        })

        const htmlManipulator = new Map([
            [Modes.REPLACE, (element, html) => element.innerHTML = html],
            [Modes.APPEND, (element, html) => element.insertAdjacentHTML(Positions.END, html)],
            [Modes.PREPEND, (element, html) => element.insertAdjacentHTML(Positions.START, html)],
        ]);

        class SSEX {
            constructor(options) {
                this.url = options?.url || "/sse";
                this.debug = options?.debug || false;
                this.eventSource = null;
                this.eventHandlers = {};
            }

            start() {
                if (this.eventSource) {
                    return;
                }

                this.eventSource = new EventSource(this.url);

                this.eventSource.onerror = (error) => {
                    this.log("SSEX connection error", error);
                };

                this.eventSource.onmessage = (event) => {
                    this.log("Generic message received:", event);
                };

                this.eventSource.addEventListener("ssex.command", (event) => {
                    this.handleCommand(JSON.parse(event.data));
                });

                this.attachDOMListeners();
            }

            attachDOMListeners() {
                this.domSubscribers();
                this.domClicks();
            }

            domClicks() {
                document.querySelectorAll("[" + Attributes.CLICK + "]").forEach((element) => {
                    const url = element.getAttribute(Attributes.CLICK);
                    element.addEventListener("click", () => {
                        fetch(url, {
                            method: "POST",
                            headers: {"X-SSEX": "true"},
                        }).then((res) => this.log("ssex-click POST:", url, res.status));
                    });
                });
            }

            domSubscribers() {
                document.querySelectorAll("[" + Attributes.SUBSCRIBE + "]").forEach((element) => {
                    const eventName = element.getAttribute(Attributes.SUBSCRIBE);
                    if (!this.eventHandlers[eventName]) {
                        this.eventHandlers[eventName] = [];

                        this.eventSource.addEventListener(eventName, (event) => {
                            this.dispatchToElements(eventName, event.data);
                        });
                    }

                    this.eventHandlers[eventName].push(element);
                });
            }

            dispatchToElements(eventName, html) {
                const htmlElements = this.eventHandlers[eventName] || [];
                htmlElements.forEach((element) => this.manipulateElement(element, html));
            }

            manipulateElement(element, html) {
                const mode = element.getAttribute(Attributes.SWAP) || Modes.REPLACE;
                htmlManipulator.get(mode)(element, html);
            }

            handleCommand(command) {
                const {action, target, value} = command;
                if (action === "alert") {
                    alert(value);
                }

                if (action === "redirect") {
                    window.location.href = value;
                }

                if (action === "replace") {
                    document.querySelector(target).innerHTML = value;
                }
            }

            log(...args) {
                if (this.debug) console.log("[SX]", ...args);
            }

        }

        window.SSEX = SSEX;
    }
)();