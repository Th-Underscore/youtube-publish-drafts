(async () => {

    // -----------------------------------------------------------------
// CONFIG (you're safe to edit this)
// -----------------------------------------------------------------
// ~ GLOBAL CONFIG
// -----------------------------------------------------------------
const MODE = 'Publish Drafts'; // 'Publish Drafts' / 'Sort Playlist'
const DEBUG_LEVEL = 1; // 0 / 1 / 2			(0 = off, 1 = only debug/"verbose" log, 2 = general log)
const VERBOSE = false; // true / false		(enable to log full elements, disable to log only text)
const LOOP_PAGES = true; // true / false	(enable to loop through all pages)
// -----------------------------------------------------------------
// ~ PUBLISH CONFIG
// -----------------------------------------------------------------
const MADE_FOR_KIDS = false; // true / false
const DESCRIPTION = ``; // (not implemented) Any static description you wish to add, just paste here (accepts multi-line)
const VISIBILITY = 'Private'; // 'Public' / 'Private' / 'Unlisted' 	(ignored if SCHEDULED_START is set)
const SCHEDULE_START = ""; // empty "" / date in standard format 	(i.e. "2025-03-17 13:15", "Mar 17, 1:15 PM", etc.)
const SCHEDULE_INTERVAL = 0;  //  zero / interval in minutes 		(i.e. 1440 for a full 24 hours between each release date. Keep 0 for same datetime)
// -----------------------------------------------------------------
// ~ SORT PLAYLIST CONFIG
// -----------------------------------------------------------------
const SORTING_KEY = (one, other) => {
    return one.name.localeCompare(other.name, undefined, {numeric: true, sensitivity: 'base'});
};
// -----------------------------------------------------------------
// ~ TIMEOUT CONFIG
// -----------------------------------------------------------------
const TIMEOUT_STEP_MS = 20;  // Default should be fast enough, but change to a lower number for even faster results
const DEFAULT_ELEMENT_TIMEOUT_MS = 2500;

// -----------------------------------------------------------------
// END OF CONFIG (not safe to edit stuff below)
// -----------------------------------------------------------------

// Art by Joan G. Stark
// .'"'.        ___,,,___        .'``.
// : (\  `."'"```         ```"'"-'  /) ;
//  :  \                         `./  .'
//   `.                            :.'
//     /        _         _        \
//    |         0}       {0         |
//    |         /         \         |
//    |        /           \        |
//    |       /             \       |
//     \     |      .-.      |     /
//      `.   | . . /   \ . . |   .'
//        `-._\.'.(     ).'./_.-'
//            `\'  `._.'  '/'
//              `. --'-- .'
//                `-...-'



// ----------------------------------
// COMMON  STUFF
// ---------------------------------
function DEBUG_LOG(...args) {
    if (!VERBOSE) {
        args = args.map((data) => (typeof data == 'string') ? data : typeof data);
    }
    switch (DEBUG_LEVEL) {
        case 1:
            console.debug(...args);
            break;
        case 2:
            console.log(...args);
    }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function untilElementNot(selector, comparator=null, baseEl=document, timeoutMs=DEFAULT_ELEMENT_TIMEOUT_MS) {
    //const  maxIterations = Math.ceil(timeoutMs / TIMEOUT_STEP_MS);
    //for (let i = 0; i < maxIterations; i++) {
    for (let timeout = timeoutMs; timeout > 0; timeout -= TIMEOUT_STEP_MS) {
        let element = baseEl.querySelector(selector);
        if (element != comparator) {
            return element;
        }
        await sleep(TIMEOUT_STEP_MS);
    }
    return null;
}

async function untilElementClosed(selector, element, baseEl=document, timeoutMs=DEFAULT_ELEMENT_TIMEOUT_MS) {
    return untilElementNot(selector, element ? element : await findElement(selector), baseEl, timeoutMs);
}

async function findElement(selector, baseEl=document, timeoutMs=DEFAULT_ELEMENT_TIMEOUT_MS) {
    const element = await untilElementNot(selector, null, baseEl, timeoutMs);
    if (element) { return element; }
    DEBUG_LOG(`could not find ${selector} inside`, baseEl);
    return null;
}

function click(element=window) {
    if (!element) { return DEBUG_LOG('cannot click on null'); }
    const result = element.dispatchEvent(new MouseEvent('click'));
    DEBUG_LOG(element, 'clicked');
    return result;
}

function updateInput(element) {
    if (!element) { return DEBUG_LOG('cannot input into null'); }
    const result = element.dispatchEvent(new Event('input', { bubbles: true }))
    DEBUG_LOG(element, 'inputted');
    return result;
}

function submitForm(element) {
    if (!element) { return DEBUG_LOG('cannot submit a null form'); }
    const result = element.dispatchEvent(new Event('submit', { bubbles: true }));
    DEBUG_LOG(element, 'submitted');
    return result;
}

// ----------------------------------
// PUBLISH STUFF
// ----------------------------------
const VISIBILITY_PUBLISH_DICT = {
    'Private': 0,
    'Unlisted': 1,
    'Public': 2
};

// SELECTORS
// ---------
const VIDEO_ROW_SELECTOR = 'ytcp-video-row';
const DRAFT_BUTTON_SELECTOR = '.edit-draft-button';
const DRAFT_MODAL_SELECTOR = 'ytcp-uploads-dialog';
const RADIO_BUTTON_SELECTOR = 'tp-yt-paper-radio-button';
const VISIBILITY_STEPPER_SELECTOR = '#step-badge-3';
const VISIBILITY_PAPER_BUTTONS_SELECTOR = 'tp-yt-paper-radio-group';
  const VISIBILITY_SCHEDULER_REVEAL_SELECTOR = '#second-container-expand-button';
  //const VISIBILITY_SCHEDULER_DATA_SELECTOR = '#publish-from-private-non-sponsor-selector';
  const VISIBILITY_SCHEDULER_DATE_DROPDOWN_SELECTOR = 'ytcp-text-dropdown-trigger';
  const VISIBILITY_SCHEDULER_DATE_SELECTOR = 'ytcp-date-picker input';
  const VISIBILITY_SCHEDULER_TIME_SELECTOR = 'ytcp-datetime-picker input';
const SAVE_BUTTON_SELECTOR = '#done-button';
const SUCCESS_DIALOG_SELECTOR = '.ytcp-video-share-dialog tp-yt-paper-dialog';
const SUCCESS_DIALOG_CLOSE_BUTTON_SELECTOR = '#close-button';
const PREVIOUS_PAGE_BUTTON_SELECTOR = '#navigate-before';
const NEXT_PAGE_BUTTON_SELECTOR = '#navigate-after';
// CHECKS
// --------
const PAGE_DESCRIPTION = '.page-description';

class SuccessDialog {
    constructor(raw) {
        this.raw = raw;
    }

    get closeDialogButton() {
        return findElement(SUCCESS_DIALOG_CLOSE_BUTTON_SELECTOR, this.raw);
    }

    async close() {
        await sleep(50);
        click(await this.closeDialogButton);
        DEBUG_LOG('closed');
    }
}

class SchedulerModal {
    constructor(raw) {
        this.raw = raw;
        this.currentScheduleDate = null;
    }

    async revealScheduler() {
        return click(await findElement(VISIBILITY_SCHEDULER_REVEAL_SELECTOR, this.raw));
    }

    get dateEl() {
        return findElement(VISIBILITY_SCHEDULER_DATE_SELECTOR);  // Calendar dropdown is external of the dialog
    }

    get timeEl() {
        return findElement(VISIBILITY_SCHEDULER_TIME_SELECTOR, this.raw);
    }

    get dateDropdownEl() {
        return findElement(VISIBILITY_SCHEDULER_DATE_DROPDOWN_SELECTOR, this.raw);
    }

    parseScheduleDateTime(scheduleString, videoIndex = 0) {
        let scheduleDate = new Date(scheduleString);

        if (SCHEDULE_INTERVAL && videoIndex) {
            scheduleDate = new Date(scheduleDate.getTime() + (SCHEDULE_INTERVAL * videoIndex * 60000));
        }

        this.currentScheduleDate = scheduleDate;
        return scheduleDate;
    }

    formatDateForInput(date) {
        // Format as YouTube-accepted date string "Mar 7, 2025"
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth()];
        const day = date.getDate();
        const year = date.getFullYear();

        return `${month} ${day}, ${year}`;
    }

    formatTimeForInput(date) {
        // Format as YouTube-accepted time string "12:30 AM"
        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';

        hours = hours % 12;
        hours = hours ? hours : 12; // Convert 0 to 12 for midnight

        return `${hours}:${minutes} ${ampm}`;
    }

    async setDate(videoIndex = 0) {
        if (!SCHEDULE_START) {
            DEBUG_LOG('No schedule date provided');
            return;
        }

        const scheduleDate = this.currentScheduleDate || this.parseScheduleDateTime(SCHEDULE_START, videoIndex);
        const formattedDate = this.formatDateForInput(scheduleDate);

        const dateDropdown = await this.dateDropdownEl;
        dateDropdown.click();

        const dateInput = await this.dateEl;
        dateInput.value = formattedDate;
        updateInput(dateInput);
        submitForm(dateInput.closest('form'));

        DEBUG_LOG(`date set to ${formattedDate}`);
    }

    async setTime(videoIndex = 0) {
        if (!SCHEDULE_START) {
            DEBUG_LOG('No schedule time provided');
            return;
        }

        // Reuse the already parsed date if available
        const scheduleDate = this.currentScheduleDate || this.parseScheduleDateTime(SCHEDULE_START, videoIndex);
        const formattedTime = this.formatTimeForInput(scheduleDate);

        const timeInput = await this.timeEl;
        timeInput.value = formattedTime;
        updateInput(timeInput);
        submitForm(timeInput.closest('form'));

        DEBUG_LOG(`time set to ${formattedTime}`);
    }

    async close() {
        click(this.raw);
    }
}

class VisibilityModal {
    constructor(raw) {
        this.raw = raw;
    }

    get radioButtonGroup() {
        return findElement(VISIBILITY_PAPER_BUTTONS_SELECTOR, this.raw);
    }

    async findVisibilityRadioButton() {
        const group = await this.radioButtonGroup;
        const value = VISIBILITY_PUBLISH_DICT[VISIBILITY];
        return [...group.querySelectorAll(RADIO_BUTTON_SELECTOR)][value];
    }

    async setVisibility() {
        click(await this.findVisibilityRadioButton());
        DEBUG_LOG(`visibility set to ${VISIBILITY}`);
        await sleep(50);
    }

    async handleScheduling(videoIndex = 0) {
        if (SCHEDULE_START && SCHEDULE_INTERVAL) {
            DEBUG_LOG('setting up video scheduling...');
            const scheduler = new SchedulerModal(this.raw);
            await scheduler.revealScheduler();
            await scheduler.setTime(videoIndex);
            await scheduler.setDate(videoIndex);
        }
    }

    get saveButton() {
        return findElement(SAVE_BUTTON_SELECTOR, this.raw);
    }

    async save() {
        click(await this.saveButton);
        await sleep(50);
        DEBUG_LOG('saving...');
        return dialog;
    }
}

class DraftModal {
    constructor(raw) {
        this.raw = raw;
    }

    get madeForKidsPaperButton() {
        const nthChild = MADE_FOR_KIDS ? 1 : 2;
        return findElement(`${RADIO_BUTTON_SELECTOR}:nth-child(${nthChild})`, this.raw);
    }

    async selectMadeForKids() {
        click(await this.madeForKidsPaperButton);
        await sleep(50);
        DEBUG_LOG(`"Made for kids" set to ${MADE_FOR_KIDS}`);
    }

    get visibilityStepper() {
        return findElement(VISIBILITY_STEPPER_SELECTOR, this.raw);
    }

    async goToVisibility() {
        DEBUG_LOG('going to Visibility');
        await sleep(50);
        click(await this.visibilityStepper);
        const visibility = new VisibilityModal(this.raw);
        await sleep(50);
        await visibility.radioButtonGroup;
        return visibility;
    }
}

class VideoRow {
    constructor(raw) {
        this.raw = raw;
    }

    get editDraftButton() {
        return findElement(DRAFT_BUTTON_SELECTOR, this.raw, 20);
    }

    async openDraft() {
        DEBUG_LOG('focusing draft button');
        click(await this.editDraftButton);
        return new DraftModal(await findElement(DRAFT_MODAL_SELECTOR));
    }
}


function fetchAllVideos() {
    return [...document.querySelectorAll(VIDEO_ROW_SELECTOR)].map((el) => new VideoRow(el));
}

async function fetchEditableVideos() {
    let editable = [];
    for (let video of fetchAllVideos()) {
        if ((await video.editDraftButton) !== null) {
            editable.push(video);
        }
    }
    return editable;
}

async function publishDrafts(videoIndex = 0) {
    let videos = await fetchEditableVideos();
    DEBUG_LOG(`found ${videos.length} videos`);

    if (videos.length === 0) {
        return 0;
    }
    if (SCHEDULE_START || SCHEDULE_INTERVAL) {
        if (!SCHEDULE_START) {
            DEBUG_LOG('No schedule start provided');
            throw new Error("No schedule start provided");
        }
        videos = videos.reverse();
    }

    for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        const draft = await video.openDraft();  // DRAFT_MODAL_SELECTOR

        await draft.selectMadeForKids();

        const visibility = await draft.goToVisibility();

        // Handle scheduling if enabled
        if (SCHEDULE_START || SCHEDULE_INTERVAL) {
            await visibility.handleScheduling(videoIndex + i);
            await visibility.save();
            const success_dialog = await findElement(SUCCESS_DIALOG_SELECTOR);
            await new SuccessDialog(success_dialog).close();
            await untilElementClosed(SUCCESS_DIALOG_SELECTOR, success_dialog);
        } else {
            await visibility.setVisibility();
            await visibility.save();
            if (VISIBILITY !== 'Private') {  // No success dialog for private videos
                const success_dialog = await findElement(SUCCESS_DIALOG_SELECTOR);
                await new SuccessDialog(success_dialog).close();
                await untilElementClosed(SUCCESS_DIALOG_SELECTOR, success_dialog);
            } else {
                await untilElementClosed(DRAFT_MODAL_SELECTOR);
            }
        }

        console.log('published draft');
    }

    return videos.length; // Return the number of videos processed
}

function findPrevPageArrow() {
    return findElement(PREVIOUS_PAGE_BUTTON_SELECTOR);
}
function findNextPageArrow() {
    return findElement(NEXT_PAGE_BUTTON_SELECTOR);
}
async function getPageDescription() {
    return (await findElement(PAGE_DESCRIPTION)).innerText;
}
async function isNextPage(oldPageDescription, timeoutMs=5000) {  // Compare old page description to new page descriptions to check if page changes
    for (let timeout = timeoutMs; timeout > 0; timeout -= TIMEOUT_STEP_MS) {
        await sleep(TIMEOUT_STEP_MS);
        let newPageDescription = await getPageDescription();
        DEBUG_LOG(`${oldPageDescription} != ${newPageDescription} ${oldPageDescription != newPageDescription}`);
        if (oldPageDescription != newPageDescription) {
            return true;
        }
    }
    DEBUG_LOG(`page description (${oldPageDescription}) did not change after ${timeoutMs}ms`);
    return null;
}

async function publishAllDrafts() {
    console.log('looping all pages...');
    let videoIndex = 0;

    if (SCHEDULE_START || SCHEDULE_INTERVAL) {  // Process from current page to first page
        let prevPageArrow = await findPrevPageArrow();
        const processedCount = await publishDrafts(videoIndex);
        videoIndex += processedCount;
        while (!prevPageArrow.disabled) {
            console.log('navigating to previous page...');
            let pageDescription = await getPageDescription();
            click(prevPageArrow);
            if (await isNextPage(pageDescription)) {
                prevPageArrow = await findPrevPageArrow();
            } else {
                console.error('could not continue to previous page');
                break;
            }
            const processedCount = await publishDrafts(videoIndex);
            videoIndex += processedCount;
        }
    } else {  // Original forward navigation
        let nextPageArrow = await findNextPageArrow();
        const processedCount = await publishDrafts();
        videoIndex += processedCount;
        while (!nextPageArrow.disabled) {
            console.log('navigating to next page...');
            let pageDescription = await getPageDescription();
            click(nextPageArrow);
            if (await isNextPage(pageDescription)) {
                await publishDrafts();
                nextPageArrow = await findNextPageArrow();
            }
            else {
                console.error('could not continue on next page');
                break;
            }
            console.log('continuing in next page...');
            const processedCount = await publishDrafts();
            videoIndex += processedCount;
        }
    }

    console.log(`completed processing ${videoIndex} videos through all pages`);
}

// ----------------------------------
// SORTING STUFF
// ----------------------------------
const SORTING_MENU_BUTTON_SELECTOR = 'button';
const SORTING_ITEM_MENU_SELECTOR = 'tp-yt-paper-listbox#items';
const SORTING_ITEM_MENU_ITEM_SELECTOR = 'ytd-menu-service-item-renderer';
const MOVE_TO_TOP_INDEX = 4;
const MOVE_TO_BOTTOM_INDEX = 5;

class SortingDialog {
    constructor(raw) {
        this.raw = raw;
    }

    async anyMenuItem() {
        const item = await findElement(SORTING_ITEM_MENU_ITEM_SELECTOR, this.raw);
        if (item === null) {
            throw new Error("could not locate any menu item");
        }
        return item;
    }

    menuItems() {
        return [...this.raw.querySelectorAll(SORTING_ITEM_MENU_ITEM_SELECTOR)];
    }

    async moveToTop() {
        click(this.menuItems()[MOVE_TO_TOP_INDEX]);
    }

    async moveToBottom() {
        click(this.menuItems()[MOVE_TO_BOTTOM_INDEX]);
    }
}
class PlaylistVideo {
    constructor(raw) {
        this.raw = raw;
    }
    get name() {
        return this.raw.querySelector('#video-title').textContent;
    }
    async dialog() {
        return this.raw.querySelector(SORTING_MENU_BUTTON_SELECTOR);
    }

    async openDialog() {
        click(await this.dialog());
        const dialog = new SortingDialog(await findElement(SORTING_ITEM_MENU_SELECTOR));
        await dialog.anyMenuItem();
        return dialog;
    }

}
async function playlistVideos() {
    return [...document.querySelectorAll('ytd-playlist-video-renderer')]
        .map((el) => new PlaylistVideo(el));
}
async function sortPlaylist() {
    DEBUG_LOG('sorting playlist');
    const videos = await playlistVideos();
    DEBUG_LOG(`found ${videos.length} videos`);
    videos.sort(SORTING_KEY);
    const videoNames = videos.map((v) => v.name);

    let index = 1;
    for (let name of videoNames) {
        DEBUG_LOG({index, name});
        const video = videos.find((v) => v.name === name);
        const dialog = await video.openDialog();
        await dialog.moveToBottom();
        await sleep(1000);
        index += 1;
    }

}

DEBUG_LOG('starting in 1000ms...');
await sleep(1000);

// ----------------------------------
// ENTRY POINT
// ----------------------------------
({
    'Publish Drafts': LOOP_PAGES ? publishAllDrafts : publishDrafts,
    'Sort Playlist': sortPlaylist,
})[MODE]();

})();