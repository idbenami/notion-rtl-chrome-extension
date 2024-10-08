// Used for detecting if the Notion page is loaded
const ROOT_LEVEL_CLASS_NAMES = [
  'notion-page-content',
  'notion-table-view',
  'notion-board-view',
  'notion-gallery-view',
];

// We need to always know if the notion document is fully loaded in order
// to observe any newly added blocks under notion-content-page element
const mutationsQueue: MutationRecord[] = [];

// A mutation to observe newest added blocks to notion-content-page element
const notionPageContextMutationObserver = new MutationObserver(() => alignPageContentToRight());

const alignListItemsToRight = () => {
  const items = document.querySelectorAll<HTMLElement>(
    `div[placeholder = "List"],
     div[placeholder = "To-do"],
     div[placeholder = "Toggle"]`,
  );

  items.forEach((item) => {
    item.style.textAlign = 'start';
  });
};

const setBlocksDirectionToAuto = () => {
  const blocks = document.querySelectorAll<HTMLElement>(
    `.notion-page-content > div[data-block-id]:not([dir]):not(.notion-column_list-block):not(.notion-collection_view_page-block),
    [placeholder="Untitled"]:not([dir]),
    .notion-column-block > div[data-block-id]:not([dir]),
    notion-collection_view-block:not([dir]),
    .notion-table-view:not([dir]),
    .notion-board-view:not([dir]),
    .notion-gallery-view:not([dir]),
    h1[placeholder = "New page"]:not([dir])`,
  );

  blocks.forEach((block) => {
    block.setAttribute('dir', 'auto');
  });
};

const alignPageContentToRight = () => {
  setBlocksDirectionToAuto();
  alignListItemsToRight();
};

const getNotionPageElement = (node: Node): Element | null => {
  if (typeof node !== 'object') return null;
  if (!(node instanceof HTMLElement)) return null;

  for (const rootLevelClassName of ROOT_LEVEL_CLASS_NAMES) {
    const notionPageElement = node.getElementsByClassName(rootLevelClassName);
    if (notionPageElement) return notionPageElement[0];
  }

  return null;
};

// Idle observe changes on notion page then align items, reason we're doing that is we shouldn't
// block any process for the main engine also we don't want to risk the performance when applying
// our styles on large documents.
const idleAlginItemsToRight: IdleRequestCallback = () => {
  for (const mutation of mutationsQueue) {
    const { addedNodes } = mutation;

    if (typeof addedNodes[0] !== 'undefined') {
      const notionPageElement = getNotionPageElement(addedNodes[0]);

      if (notionPageElement) {
        alignPageContentToRight();

        notionPageContextMutationObserver.disconnect();
        notionPageContextMutationObserver.observe(notionPageElement, {
          childList: true,
          subtree: false,
        });
      }
    }
  }

  // Clean queue
  mutationsQueue.splice(0, mutationsQueue.length);
};

const isMutationQueueEmpty = () => {
  return !mutationsQueue.length;
};

// Entry point for the mutation observer
const onNotionDocumentLoaded: MutationCallback = (mutationsList) => {
  if (isMutationQueueEmpty()) {
    requestIdleCallback(idleAlginItemsToRight);
  }

  mutationsQueue.push(...mutationsList);
};

const notionDocumentMutationObserver = new MutationObserver(onNotionDocumentLoaded);
notionDocumentMutationObserver.observe(document, { childList: true, subtree: true });
