const selectModeCheckbox = document.getElementById("select-mode-checkbox");
const swapCheckbox = document.getElementById("swap-checkbox");
const searchBox = document.getElementById('search-box');


(async () => await setSelectModeChk())();
buildTab();
setSwapChk();
setWebsiteList();


swapCheckbox.addEventListener("change", function () {
    try {
        chrome.storage.local.set({ swap: this.checked }).then(setKeyManual);
    }
    catch (error) {
        this.checked = !this.checked;
    }
});


selectModeCheckbox.addEventListener("change", function () {
    (async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        try {
            const response = await chrome.tabs.sendMessage(tab.id, { type: "setSelectMode", data: this.checked });
            if (!response.ack) {
                throw new Error("False ack");
            }
        }
        catch (error) {
            this.checked = !this.checked;
        }
    })();
});


searchBox.oninput = () => {
    const searchInput = searchBox.value.toLowerCase();
    document.querySelectorAll('.list-item').forEach(item => {
        item.textContent.toLowerCase().includes(searchInput) ? item.style.display = 'flex' : item.style.display = 'none'
    });
};


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
        focusSearchBox(searchBox);
    }
});


document.getElementById('github-button').addEventListener('click', function () {
    chrome.tabs.create({ url: 'https://github.com/wuutae/slash-to-search' });
});


async function setSelectModeChk() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const response = await chrome.tabs.sendMessage(tab.id, { type: "getSelectMode", data: this.checked });
        selectModeCheckbox.checked = response.data;
    } catch (error) { }
}


function buildTab() {
    const tabItem = document.querySelectorAll(".container__item");
    const tabContent = document.querySelectorAll(".container__inner");

    for (let i = 0; i < tabItem.length; i++) {
        tabItem[i].addEventListener("mouseover", () => {
            tabItem.forEach((item) => {
                item.classList.remove("container__item_active");
            });
            tabContent.forEach((item) => {
                item.classList.add("container__inner_hidden");
            });
            tabItem[i].classList.add("container__item_active");
            tabContent[i].classList.remove("container__inner_hidden");
        });
    }
}


function setSwapChk() {
    chrome.storage.local.get(["swap"]).then((result) => {
        swapCheckbox.checked = result.swap ? true : false;
        setKeyManual();
    });
}


function setKeyManual() {
    const nonResetKey = document.getElementById('nonResetKey');
    const resetKey = document.getElementById('resetKey');

    swapCheckbox.checked
        ? (nonResetKey.textContent = '?', resetKey.textContent = '/')
        : (nonResetKey.textContent = '/', resetKey.textContent = '?');
}


function setWebsiteList() {
    const listContainer = document.getElementById('list-container');
    const emptyMessage = document.getElementById('empty-message');

    chrome.storage.local.get(["savedSearchBoxes"], function (result) {
        if (!result.savedSearchBoxes) {
            return;
        }
        if (Object.keys(result.savedSearchBoxes).length > 0) {
            emptyMessage.style.display = 'none';
        }

        Object.keys(result.savedSearchBoxes).forEach(item => {
            const listItem = document.createElement('div');
            const textElement = document.createElement('span');
            const deleteButton = document.createElement('button');
            listItem.classList.add('list-item');
            textElement.textContent = item;
            deleteButton.classList.add('material-symbols-outlined');
            deleteButton.textContent = 'delete_forever';
            deleteButton.onclick = () => {
                delete result.savedSearchBoxes[item];
                chrome.storage.local.set({ savedSearchBoxes: result.savedSearchBoxes }, () => {
                    listContainer.removeChild(listItem);
                    if (Object.keys(result.savedSearchBoxes).length === 0) {
                        emptyMessage.style.display = 'flex';
                    }
                });
            };
            listItem.appendChild(textElement);
            listItem.appendChild(deleteButton);
            listContainer.appendChild(listItem);
        });
    });
}