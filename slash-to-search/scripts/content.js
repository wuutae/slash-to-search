let selectMode = false;
const originalStyle = {};


document.addEventListener("keydown", function (event) {
    function focusSearchBox(searchBox) {
        if (!searchBox) {
            return;
        }
        searchBox.focus();
        chrome.storage.local.get(["swap"]).then((result) => {
            if (result.swap) {
                event.key === '/' ? (searchBox.value = '') : searchBox.setSelectionRange(searchBox.value.length, searchBox.value.length);
            } else {
                event.key === '/' ? searchBox.setSelectionRange(searchBox.value.length, searchBox.value.length) : (searchBox.value = '');
            }
        });
        event.preventDefault();
    }

    if (['/', '?'].includes(event.key)) {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
            return;
        }
        const searchBox = document.querySelector('input[type="search"], input[type="text"], textarea');
        focusSearchBox(searchBox);

        chrome.storage.local.get(["savedSearchBoxes"]).then((result) => {
            const savedSearchBoxes = result["savedSearchBoxes"];
            if (!(savedSearchBoxes && savedSearchBoxes.hasOwnProperty(document.location.hostname))) {
                return;
            }
            const selector = savedSearchBoxes[document.location.hostname];
            focusSearchBox(document.querySelector(selector));
        });
    }
});


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.type) {
        case "setSelectMode":
            try {
                if (typeof request.data === "boolean") {
                    setSelectMode(request.data);
                    sendResponse({ ack: true });
                } else {
                    throw new Error("Invalid data type");
                }
            }
            catch (error) {
                sendResponse({ ack: false });
            }
            break;
        case "getSelectMode":
            sendResponse({ data: selectMode });
            break;
    }
    return true;
});


function getSelectorPath(element) {
    const names = [];
    let c;
    while (element.parentNode) {
        if (element.id) {
            names.unshift('#' + element.id);
            break;
        } else {
            if (element == element.ownerDocument.documentElement) names.unshift(element.tagName);
            else {
                for (c = 1, e = element; e.previousElementSibling; e = e.previousElementSibling, c++);
                names.unshift(element.tagName + ":nth-child(" + c + ")");
            }
            element = element.parentNode;
        }
    }
    return names.join(" > ");
}


function setSelectMode(isOn) {
    selectMode = isOn;
    const selectableElements = Array.from(document.querySelectorAll('input, textarea'));
    if (isOn) {
        selectableElements.forEach(function (element) {
            element.addEventListener("mouseover", handleMouseOver);
            element.addEventListener("mouseout", handleMouseOut);
            element.addEventListener("click", handleClick);
        });
    } else {
        selectableElements.forEach(function (element) {
            element.removeEventListener("mouseover", handleMouseOver);
            element.removeEventListener("mouseout", handleMouseOut);
            element.removeEventListener("click", handleClick);
        });
    }
}


function handleMouseOver(event) {
    originalStyle[event.target] = event.target.style;
    event.target.style.transition = 'border 0.3s ease, border-radius 0.3s ease';
    event.target.style.border = '5px solid rgb(0, 255, 0)';
    event.target.style.borderRadius = '10px'
}


function handleMouseOut(event) {
    event.target.style = originalStyle[event.target];
}


function handleClick(event) {
    const bubble = document.createElement("div");
    bubble.style.display = 'flex';
    bubble.style.justifyContent = 'center';
    bubble.style.position = "absolute";
    bubble.style.left = `${event.clientX + window.scrollX}px`;
    bubble.style.top = `${event.clientY + window.scrollY}px`;
    bubble.style.zIndex = 2147483647;
    bubble.style.fontFamily = "sans-serif";
    bubble.style.background = 'rgba(0, 0, 0, 0.7)';
    bubble.style.padding = "5px";
    bubble.style.paddingLeft = "10px";
    bubble.style.paddingRight = "10px";
    bubble.style.borderRadius = "15px";
    bubble.style.transition = "opacity 0.75s ease";

    const textElement = document.createElement("span");
    textElement.textContent = "This element will be the search bar for this site from now on.";
    textElement.style.fontSize = "13px";
    textElement.style.color = "white";
    textElement.style.userSelect = 'none';

    bubble.appendChild(textElement);
    document.body.appendChild(bubble);
    event.target.style = originalStyle[event.target];

    setSelectMode(false);

    chrome.storage.local.get(['savedSearchBoxes']).then((result) => {
        const savedSearchBoxes = result.savedSearchBoxes || {};
        savedSearchBoxes[document.location.hostname] = getSelectorPath(event.target);
        chrome.storage.local.set({ savedSearchBoxes: savedSearchBoxes });
    });

    setTimeout(function () {
        bubble.style.opacity = 0;
        setTimeout(function () {
            document.body.removeChild(bubble);
        }, 750);
    }, 3000);
}
