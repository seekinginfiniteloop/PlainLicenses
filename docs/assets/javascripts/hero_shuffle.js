/**
 * We wait for the DOM to load before initializing the hero images
 * We get all the picture elements in the hero section
 */
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const colors = {
  atomicOrange: "var(--atomic-tangerine)",
  aqua: "var(--aqua)",
  aquamarine: "var(--aquamarine)",
  blueBlue: "var(--blue-blue)",
  darkEmerald: "var(--dark-emerald)",
  dutchWhite: "var(--dutch-white)",
  ecru: "var(--ecru)",
  emerald: "var(--emerald)",
  mindaro: "var(--mindaro)",
  white: "white",
  zaffre: "var(--zaffre)",
};

const defaultColor = { h1: colors.emerald, p: colors.emerald };

const colorOptions = {
  abstract: { h1: colors.blueBlue, p: colors.blueBlue },
  anime: { h1: colors.atomicOrange, p: colors.emerald},
  artbrut: {h1: colors.atomicOrange, p: colors.aqua},
  comic: {h1: colors.aquamarine, p: colors.atomicOrange},
  fanciful: {h1: colors.zaffre, p: colors.blueBlue},
  fantasy: {h1: colors.emerald, p: colors.mindaro},
  farcical: {h1: colors.emerald, p: colors.blueBlue},
  fauvist: {h1: colors.white, p: colors.white},
  minimal: {h1: colors.blueBlue, p: colors.blueBlue},
  mystical: {h1: colors.blueBlue, p: colors.blueBlue},
  surreal: {h1: colors.white, p: colors.white},
};


// Function to generate color mappings
const generateColorMappings = (options) => {
  return Object.keys(options).reduce((acc, key) => {
    acc[key] = options[key];
    return acc;
  }, {});
};

document.addEventListener("DOMContentLoaded", () => {
  const pics = Array.from(
    document.querySelectorAll("picture.mdx-parallax__layer")
  );
  // This section handles color mappings for the hero images
  // We define a set of colors for each image
  // We use these colors to update the colors of the h1 and p elements in the hero section so they display well with the image


  const colorMappings = generateColorMappings(colorOptions);

  /**
   * Shuffles the elements of an array in place.
   *
   * This function implements the Fisher-Yates (Knuth) shuffle algorithm, which efficiently randomizes the order of elements in the provided array. The original array is modified, and the shuffled array is returned.
   *
   * @param {Array} array - The array to be shuffled. The array will be modified in place.
   * @returns {Array} The shuffled array.
   */
  async function shuffle(array) {
    let currentIndex = array.length;

    while (currentIndex != 0) {
      let randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex],
        array[currentIndex],
      ];
    }
    return array;
  }

  // gets the source elements of a picture element
  async function getSources(picture) {
    return Array.from(picture.querySelectorAll("source"));
  }

  // gets the img element of a picture element
  // @returns {document.Element} The img element of the picture element
  async function getImg(picture) {
    return picture.querySelector("img");
  }

  // sets the picture element to inactive state
  async function setInactivePicture(picture) {
    setTimeout(() => {
      picture.classList.add("fade-out");
    }, 500);
    picture.classList.remove("active");
  }

  /**  sets the picture element to active state
   * We use css classes to animate the transition between images
   * We add the fade-in class to the picture element to animate the transition
   * We add the active class to the picture element to keep it visible
   * We remove the fade-in class to prevent the animation from replaying
   */
  async function setActivePicture(picture, firstLoad = false) {
    if (firstLoad) {
      picture.classList.add("active");
      return;
    }
    setTimeout(() => {
      picture.classList.add("fade-in");
      picture.classList.remove("fade-out");

    }, 1000);
    picture.classList.add("active");
    picture.classList.remove("fade-in");
  }

  /** sets the source elements of a picture element
   * We set the srcset attribute of each source element to the value of the data-srcset attribute
   * We remove the data-srcset attribute to be clean about it
   * We do this so the browser doesn't try to fetch all images on page load
   */
  async function setSources(picture) {
    const sources = await getSources(picture);
    sources.forEach((source) => {
      if (source.dataset.srcset) {
        source.srcset = source.dataset.srcset;
        source.removeAttribute("data-srcset");
      }
    });
  }

  // sets the img element of a picture element, setting src and srcset attributes
  async function setImg(picture, loadFirst = false) {
    const img = await getImg(picture);
    if (img && img.dataset.src) {
      img.src = img.dataset.src;
      img.srcset = img.dataset.srcset;
    }
    if (loadFirst) {
      img.loading = "eager";
    }
  }

  // preps the next image to be displayed
  async function prepNextImage(picture) {
    setSources(picture);
    setImg(picture);
  }

  // loads the first image
  async function loadFirstImage(picture) {
    return new Promise((resolve, reject) => {
      updateColorsForPicture(picture, true);
      setSources(picture);
      setImg(picture, true);
      setActivePicture(picture, true);
      const img = getImg(picture);
      if (img.complete) {
        resolve();
      } else {
        img.onload = resolve;
        img.onerror = reject;
      }
      resolve();
    });
  }

  // updates the colors for a picture
  // We can use our color mappings to update the colors of the h1 and p elements in the hero section so they display well with the image
  async function updateColorsForPicture(picture, firstLoad = false) {
    const sourceElement = picture.querySelector("source");
    if (sourceElement && sourceElement.dataset.image) {
      const imageName = sourceElement.dataset.image;
      const colors = colorMappings[imageName] || defaultColor;
      updateColors(colors, firstLoad);
    } else {
      updateColors(defaultColor, firstLoad);
    }
  }

  // updates the colors of the h1 and p elements in the hero section
  async function updateColors(colors, firstLoad = false) {
    const h1 = document.getElementById("CTA_header");
    const p = document.getElementById("CTA_paragraph");

    if (h1) {
      if (!firstLoad) {
        h1.style.transition = "color 0.5s ease-in";
      }
      h1.style.color = colors.h1;
    }
    if (p) {
      if (!firstLoad) {
        p.style.transition = "color 0.5s ease-in";
      }
      p.style.color = colors.p;
    }
  }

  /**
   * Serves the next image in the hero section
   * Handles the transition between images
   *
   * @param {document.Element} currentPicture - The current picture element being displayed
   * @param {document.Element} nextPicture - The next picture element to be displayed
   */

  async function serveNextImage(currentPicture, nextPicture) {
    return new Promise((resolve, reject) => {
      const img = getImg(nextPicture);
      if (img.complete) {
        setActivePicture(nextPicture);
        setInactivePicture(currentPicture);
        updateColorsForPicture(nextPicture);
        resolve();
      } else {
        img.onload = () => {
          setActivePicture(nextPicture);
          setInactivePicture(currentPicture);
          updateColorsForPicture(nextPicture);
          resolve();
        };
        img.onerror = reject;
      }
    });
  }

  // loops through the pictures
  async function loopPictures(pictures, currentIndex, nextIndex) {
    async function showNextImage() {
      try {
        await serveNextImage(pictures[currentIndex], pictures[nextIndex]);
        currentIndex = nextIndex;
        nextIndex = (nextIndex + 1) % pictures.length;
        prepNextImage(pictures[nextIndex]);
      } catch (error) {
        console.error("Failed to load image:", error);
      }

      setTimeout(showNextImage, 30000);
    }

    prepNextImage(pictures[nextIndex]);
    showNextImage();
  }

  // initializes the the picture and image loading
  async function initializePictures(pics, counter = 0) {
    const pictures = await shuffle(pics);
    const firstPicture = pictures[0];
    loadFirstImage(firstPicture).then(() => {
      loopPictures(pictures, 0, 1);
      })
      .catch((error) => {
        console.error("Failed to load first image:", error);
      });
    if (counter === 5) {
      console.error("Failed to load images after 5 attempts");
      setTimeout(() => {
        counter += 1;
        initializePictures(pics, counter);
      }, 1000);
    }
  }
  initializePictures(pics);
});
