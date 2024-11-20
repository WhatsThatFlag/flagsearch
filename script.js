// Global variables to store data
let categoriesData = {};
let flagsData = {};
let includedCategories = [];
let excludedCategories = [];
let hideOffensive = true; // Set to true by default
let hideHistorical = false; // Set to false by default
let nameSearchQuery = ''; // Holds the search query for name or subtext
let tags = []; // Holds the tags entered by the user

// Function to load categories into the DOM
function loadCategories() {
  const categoryContainer = document.getElementById('category-container');
  categoryContainer.innerHTML = ''; // Clear previous categories

  for (const group in categoriesData) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'category-group';

    const groupTitle = document.createElement('h3');
    groupTitle.textContent = capitalizeFirstLetter(group);
    groupDiv.appendChild(groupTitle);

    for (const catKey in categoriesData[group]) {
      const categoryItem = document.createElement('div');
      categoryItem.className = 'category-item';

      // Category label
      const categoryLabel = document.createElement('span');
      categoryLabel.className = 'category-label';
      categoryLabel.textContent = categoriesData[group][catKey].name;
      categoryItem.appendChild(categoryLabel);

      // Include checkbox (green)
      const includeLabel = document.createElement('label');
      includeLabel.className = 'include-label';
      includeLabel.title = 'Include';

      const includeCheckbox = document.createElement('input');
      includeCheckbox.type = 'checkbox';
      includeCheckbox.id = `include:${group}:${catKey}`;
      includeCheckbox.value = `${group}:${catKey}`;
      includeCheckbox.className = 'include-checkbox';

      includeLabel.appendChild(includeCheckbox);
      includeLabel.appendChild(document.createTextNode('+'));

      // Exclude checkbox (red)
      const excludeLabel = document.createElement('label');
      excludeLabel.className = 'exclude-label';
      excludeLabel.title = 'Exclude';

      const excludeCheckbox = document.createElement('input');
      excludeCheckbox.type = 'checkbox';
      excludeCheckbox.id = `exclude:${group}:${catKey}`;
      excludeCheckbox.value = `${group}:${catKey}`;
      excludeCheckbox.className = 'exclude-checkbox';

      excludeLabel.appendChild(excludeCheckbox);
      excludeLabel.appendChild(document.createTextNode('-'));

      // Event listeners to ensure only one of them can be checked at a time
      includeCheckbox.addEventListener('change', () => {
        if (includeCheckbox.checked && excludeCheckbox.checked) {
          excludeCheckbox.checked = false;
        }
        updateSelectedCategories();
        performSearch();
      });

      excludeCheckbox.addEventListener('change', () => {
        if (includeCheckbox.checked && excludeCheckbox.checked) {
          includeCheckbox.checked = false;
        }
        updateSelectedCategories();
        performSearch();
      });

      categoryItem.appendChild(includeLabel);
      categoryItem.appendChild(excludeLabel);

      groupDiv.appendChild(categoryItem);
    }

    categoryContainer.appendChild(groupDiv);
  }
}

// Function to update selected categories and hide options
function updateSelectedCategories() {
  includedCategories = [];
  excludedCategories = [];

  document.querySelectorAll('#category-container .include-checkbox').forEach(checkbox => {
    if (checkbox.checked) {
      includedCategories.push(checkbox.value);
    }
  });
  document.querySelectorAll('#category-container .exclude-checkbox').forEach(checkbox => {
    if (checkbox.checked) {
      excludedCategories.push(checkbox.value);
    }
  });

  // Update hide options
  hideOffensive = document.getElementById('hide-offensive').checked;
  hideHistorical = document.getElementById('hide-historical').checked;
}

// Function to perform the search
function performSearch() {
  const resultsContainer = document.getElementById('results-container');
  resultsContainer.innerHTML = ''; // Clear previous results

  const matchingFlagsCountDiv = document.getElementById('matching-flags-count');
  matchingFlagsCountDiv.innerHTML = ''; // Clear previous count

  // Get the name search query
  nameSearchQuery = document.getElementById('search-bar').value.trim().toLowerCase();

  // Convert flagsData to an array for easier processing
  const flagsArray = Object.values(flagsData);

  // Filter flags based on included/excluded categories, tags, name search query, and hide options
  const filteredFlags = flagsArray.filter(flag => {
    const flagCategories = flag.cat.replace(/\s/g, '').split(',');

    // Check included categories
    const matchesIncludedCategories = includedCategories.every(cat => flagCategories.includes(cat));

    // Check excluded categories
    const matchesExcludedCategories = excludedCategories.every(cat => !flagCategories.includes(cat));

    // Check tags
    const matchesTags = tags.every(tag => {
      // If tag is in the flag's categories
      return flagCategories.includes(tag.id);
    });

    // Check name, subtext, or terms (allow partial matches)
    let matchesNameSearch = true;
    if (nameSearchQuery) {
      if (nameSearchQuery.startsWith('subtext:')) {
        const subtextSearch = nameSearchQuery.replace('subtext:', '').trim();
        matchesNameSearch = flag.subtext && flag.subtext.toLowerCase().includes(subtextSearch);
      } else {
        const terms = flag.terms ? flag.terms.toLowerCase().split(',').map(s => s.trim()) : [];
        matchesNameSearch =
          flag.name.toLowerCase().includes(nameSearchQuery) ||
          terms.some(term => term.includes(nameSearchQuery));
      }
    }

    // Check hide options
    const isOffensive = flag.offensive === true;
    const isHistorical = flag.historical === true;

    const hideFlag = (hideOffensive && isOffensive) || (hideHistorical && isHistorical);

    return matchesIncludedCategories && matchesExcludedCategories && matchesTags && matchesNameSearch && !hideFlag;
  });

  // Sort the filtered flags
  filteredFlags.sort((a, b) => {
    const nameA = a.name.toUpperCase(); // Ignore case
    const nameB = b.name.toUpperCase(); // Ignore case

    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;

    // If names are equal, sort by the highest number in subtext (assuming subtext contains years)
    const yearA = extractYear(a.subtext);
    const yearB = extractYear(b.subtext);
    return yearB - yearA; // Descending order
  });

  // Display the matching flags count
  displayMatchingFlagsCount(filteredFlags.length);

  // Display the filtered and sorted flags with fade-in animation
  if (filteredFlags.length === 0) {
    displayNoResultsMessage();
  } else {
    filteredFlags.forEach((flag, index) => {
      const flagItem = document.createElement('div');
      flagItem.className = 'flag-item';

      // Left side container
      const flagItemLeft = document.createElement('div');
      flagItemLeft.className = 'flag-item-left';

      const img = document.createElement('img');
      img.src = flag.img;
      img.alt = flag.name;
      img.className = 'popup-flag-image';
      flagItemLeft.appendChild(img);

      const detailsDiv = document.createElement('div');
      detailsDiv.className = 'flag-details';

      const nameDiv = document.createElement('div');
      nameDiv.className = 'flag-name-container';

      const nameText = document.createElement('span');
      nameText.className = 'flag-name';
      nameText.textContent = flag.name;
      nameDiv.appendChild(nameText);

      // Subtext
      const subtextDiv = document.createElement('div');
      subtextDiv.className = 'flag-subtext';
      subtextDiv.textContent = flag.subtext || '';

      detailsDiv.appendChild(nameDiv);
      detailsDiv.appendChild(subtextDiv);

      flagItemLeft.appendChild(detailsDiv);

      flagItem.appendChild(flagItemLeft);

      // Right side container for offensive and historical icons
      const flagItemRight = document.createElement('div');
      flagItemRight.className = 'flag-item-right';

      // Check for offensive and historical properties
      const hasOffensive = flag.offensive === true;
      const hasHistorical = flag.historical === true;

      if (hasOffensive && hasHistorical) {
        // Both icons: Offensive icon first, then Historical icon
        const offensiveIcon = document.createElement('img');
        offensiveIcon.src = 'icons/offensive.png';
        offensiveIcon.alt = 'Potentially Offensive';
        offensiveIcon.className = 'offensive-icon';
        offensiveIcon.title = 'Potentially Offensive';

        const historicalIcon = document.createElement('img');
        historicalIcon.src = 'icons/historical.png';
        historicalIcon.alt = 'Historical';
        historicalIcon.className = 'historical-icon';
        historicalIcon.title = 'Historical';

        flagItemRight.appendChild(offensiveIcon);
        flagItemRight.appendChild(historicalIcon);
      } else if (hasOffensive) {
        // Only Offensive icon
        const offensiveIcon = document.createElement('img');
        offensiveIcon.src = 'icons/offensive.png';
        offensiveIcon.alt = 'Potentially Offensive';
        offensiveIcon.className = 'offensive-icon';
        offensiveIcon.title = 'Potentially Offensive';

        flagItemRight.appendChild(offensiveIcon);
      } else if (hasHistorical) {
        // Only Historical icon
        const historicalIcon = document.createElement('img');
        historicalIcon.src = 'icons/historical.png';
        historicalIcon.alt = 'Historical';
        historicalIcon.className = 'historical-icon';
        historicalIcon.title = 'Historical';

        flagItemRight.appendChild(historicalIcon);
      }

      flagItem.appendChild(flagItemRight);

      // Add click event listener to open popup
      flagItem.addEventListener('click', () => {
        openPopup(flag);
      });

      resultsContainer.appendChild(flagItem);

      // Add fade-in animation with slight delay
      setTimeout(() => {
        flagItem.classList.add('fade-in');
      }, index * 50); // Adjust delay as needed
    });
  }
}

// Function to display the matching flags count
function displayMatchingFlagsCount(count) {
  const matchingFlagsCountDiv = document.getElementById('matching-flags-count');

  if (count === 0) {
    matchingFlagsCountDiv.textContent = "We searched far and wide, but found nothing :(";
  } else if (count === 1) {
    matchingFlagsCountDiv.textContent = `${count} flag found`;
  } else {
    matchingFlagsCountDiv.textContent = `${count} flags found`;
  }
}

// Function to extract the highest year from subtext
function extractYear(subtext) {
  if (!subtext) return 0;
  const years = subtext.match(/\d{4}/g);
  if (years) {
    return Math.max(...years.map(Number));
  }
  return 0;
}

// Function to display the no results message with search corrector
function displayNoResultsMessage() {
  const resultsContainer = document.getElementById('results-container');
  const matchingFlagsCountDiv = document.getElementById('matching-flags-count');

  matchingFlagsCountDiv.textContent = "We searched far and wide, but found nothing :(";

  const noResult = document.createElement('div');
  noResult.style.fontSize = '18px';
  noResult.style.color = '#555';
  noResult.style.textAlign = 'center';
  noResult.style.marginTop = '20px';

  // Suggest possible matches
  const suggestion = getSuggestion(nameSearchQuery);
  if (suggestion) {
    noResult.innerHTML = `Did you mean <span class="suggestion">${suggestion}</span>?`;
    noResult.querySelector('.suggestion').style.color = '#007BFF';
    noResult.querySelector('.suggestion').style.cursor = 'pointer';
    noResult.querySelector('.suggestion').addEventListener('click', () => {
      document.getElementById('search-bar').value = suggestion;
      performSearch();
    });
  } else {
    noResult.textContent = 'No flags match your search criteria.';
  }

  resultsContainer.appendChild(noResult);
}

// Function to get a suggestion based on the closest match
function getSuggestion(query) {
  if (!query) return null;

  const allNamesAndTerms = [];

  Object.values(flagsData).forEach(flag => {
    allNamesAndTerms.push(flag.name.toLowerCase());
    if (flag.terms) {
      allNamesAndTerms.push(...flag.terms.toLowerCase().split(',').map(s => s.trim()));
    }
  });

  let closestMatch = '';
  let smallestDistance = Infinity;

  allNamesAndTerms.forEach(nameOrTerm => {
    const distance = levenshteinDistance(query, nameOrTerm);
    if (distance < smallestDistance) {
      smallestDistance = distance;
      closestMatch = nameOrTerm;
    }
  });

  // Only suggest if the distance is within a reasonable threshold
  if (smallestDistance <= Math.max(2, Math.floor(query.length / 2))) {
    // Capitalize the first letter for display
    return capitalizeFirstLetter(closestMatch);
  } else {
    return null;
  }
}

// Levenshtein Distance Algorithm
function levenshteinDistance(a, b) {
  const matrix = [];

  // Increment along the first column of each row
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // Increment each column in the first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // Substitution
          matrix[i][j - 1] + 1,     // Insertion
          matrix[i - 1][j] + 1      // Deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Function to open the popup with flag details
function openPopup(flag) {
  const popupOverlay = document.getElementById('popup-overlay');
  const popupContent = document.getElementById('popup-content');

  // Clear previous content (except the close button)
  popupContent.innerHTML = '<span id="popup-close">&times;</span>';

  // Larger flag image
  const img = document.createElement('img');
  img.src = flag.img;
  img.alt = flag.name;
  popupContent.appendChild(img);

  // Flag header (Name and Ratio)
  const flagHeader = document.createElement('div');
  flagHeader.className = 'flag-header';

  // Name container
  const nameDiv = document.createElement('div');
  nameDiv.className = 'flag-name-container';

  // Name
  const nameText = document.createElement('span');
  nameText.className = 'flag-name';
  nameText.textContent = flag.name;
  nameDiv.appendChild(nameText);

  // Check for offensive and historical properties
  const hasOffensive = flag.offensive === true;
  const hasHistorical = flag.historical === true;

  if (hasOffensive && hasHistorical) {
    // Both icons: Offensive icon first, then Historical icon
    const offensiveIcon = document.createElement('img');
    offensiveIcon.src = 'icons/offensive.png';
    offensiveIcon.alt = 'Potentially Offensive';
    offensiveIcon.className = 'offensive-icon-popup';
    offensiveIcon.title = 'Potentially Offensive';

    const historicalIcon = document.createElement('img');
    historicalIcon.src = 'icons/historical.png';
    historicalIcon.alt = 'Historical';
    historicalIcon.className = 'historical-icon-popup';
    historicalIcon.title = 'Historical';

    nameDiv.appendChild(offensiveIcon);
    nameDiv.appendChild(historicalIcon);
  } else if (hasOffensive) {
    // Only Offensive icon
    const offensiveIcon = document.createElement('img');
    offensiveIcon.src = 'icons/offensive.png';
    offensiveIcon.alt = 'Potentially Offensive';
    offensiveIcon.className = 'offensive-icon-popup';
    offensiveIcon.title = 'Potentially Offensive';

    nameDiv.appendChild(offensiveIcon);
  } else if (hasHistorical) {
    // Only Historical icon
    const historicalIcon = document.createElement('img');
    historicalIcon.src = 'icons/historical.png';
    historicalIcon.alt = 'Historical';
    historicalIcon.className = 'historical-icon-popup';
    historicalIcon.title = 'Historical';

    nameDiv.appendChild(historicalIcon);
  }

  flagHeader.appendChild(nameDiv);

  // Ratio
  const ratioDiv = document.createElement('div');
  ratioDiv.className = 'flag-ratio';
  ratioDiv.textContent = '[Calculating...]'; // Placeholder

  flagHeader.appendChild(ratioDiv);

  popupContent.appendChild(flagHeader);

  // Calculate the flag ratio
  calculateImageRatio(flag.img).then(ratioText => {
    ratioDiv.textContent = `[${ratioText}]`;
  });

  // Subtext
  const subtextDiv = document.createElement('div');
  subtextDiv.className = 'flag-subtext';
  subtextDiv.textContent = flag.subtext || '';
  popupContent.appendChild(subtextDiv);

  // Categories
  const categoriesDiv = document.createElement('div');
  categoriesDiv.className = 'categories';

  const flagCategories = flag.cat.replace(/\s/g, '').split(',');

  flagCategories.forEach(catKey => {
    const categoryBox = document.createElement('div');
    categoryBox.className = 'category-box';

    // Get category name
    const [group, key] = catKey.split(':');
    const categoryName = categoriesData[group]?.[key]?.name || catKey;

    categoryBox.textContent = categoryName;

    // Add click event to search for this category
    categoryBox.addEventListener('click', () => {
      // Reset included categories and select this one
      includedCategories = [catKey];
      excludedCategories = []; // Don't modify excluded categories
      nameSearchQuery = ''; // Clear name search query
      document.getElementById('search-bar').value = ''; // Clear search bar
      tags = []; // Clear tags
      updateTagContainer();

      // Update include checkboxes
      document.querySelectorAll('#category-container .include-checkbox').forEach(checkbox => {
        checkbox.checked = includedCategories.includes(checkbox.value);
      });

      // Reset hide options
      document.getElementById('hide-offensive').checked = false;
      document.getElementById('hide-historical').checked = false;
      hideOffensive = false;
      hideHistorical = false;

      // Update selected categories and perform search
      updateSelectedCategories();
      performSearch();

      // Close the popup
      closePopup();
    });

    categoriesDiv.appendChild(categoryBox);
  });

  popupContent.appendChild(categoriesDiv);

  // "More Flags Like This" Button
  const moreFlagsButton = document.createElement('button');
  moreFlagsButton.id = 'more-flags-button';
  moreFlagsButton.textContent = 'More Flags Like This';

  moreFlagsButton.addEventListener('click', () => {
    // Apply all categories of the flag as included categories
    includedCategories = [...flagCategories];
    // Don't modify excluded categories
    tags = [];
    updateTagContainer();
    nameSearchQuery = '';
    document.getElementById('search-bar').value = '';

    // Update include checkboxes
    document.querySelectorAll('#category-container .include-checkbox').forEach(checkbox => {
      checkbox.checked = includedCategories.includes(checkbox.value);
    });

    // Reset hide options
    document.getElementById('hide-offensive').checked = false;
    document.getElementById('hide-historical').checked = false;
    hideOffensive = false;
    hideHistorical = false;

    // Update selected categories and perform search
    updateSelectedCategories();
    performSearch();

    // Close the popup
    closePopup();
  });

  popupContent.appendChild(moreFlagsButton);

  // Close button functionality
  document.getElementById('popup-close').addEventListener('click', closePopup);

  // Show the popup
  popupOverlay.style.display = 'flex';
}

// Function to calculate the image ratio and reduce it to smallest integers
function calculateImageRatio(imageSrc) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = function() {
      let width = img.width;
      let height = img.height;

      // Round dimensions to the nearest integer
      width = Math.round(width);
      height = Math.round(height);

      // Reduce the ratio to the smallest integers
      const gcdValue = gcd(width, height);
      const reducedWidth = width / gcdValue;
      const reducedHeight = height / gcdValue;

      resolve(`${reducedHeight}:${reducedWidth}`);
    };
    img.onerror = function() {
      resolve('N/A');
    };
    img.src = imageSrc;
  });
}

// Function to compute the greatest common divisor (GCD)
function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

// Function to close the popup
function closePopup() {
  const popupOverlay = document.getElementById('popup-overlay');
  popupOverlay.style.display = 'none';
}

// Function to capitalize the first letter
function capitalizeFirstLetter(string) {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Function to load data from JSON files
function loadData() {
  // Load categories
  fetch('catreg.json')
    .then(response => response.json())
    .then(data => {
      categoriesData = data;
      loadCategories();
      updateSelectedCategories(); // Initialize hide options based on default checkbox states
      performSearch(); // Perform initial search to display flags based on hide options
    })
    .catch(error => {
      console.error('Error loading categories:', error);
    });

  // Load flags
  fetch('flagreg.json')
    .then(response => response.json())
    .then(data => {
      flagsData = data;
      updateTotalFlagsCounter(); // Update the total flags counter after loading flags
      performSearch(); // Perform initial search to display flags based on hide options
    })
    .catch(error => {
      console.error('Error loading flags:', error);
    });
}

// Event listener for the deselect all button
document.getElementById('deselect-button').addEventListener('click', () => {
  includedCategories = [];
  excludedCategories = [];
  tags = [];
  nameSearchQuery = '';
  hideOffensive = false;
  hideHistorical = false;

  // Uncheck all include and exclude checkboxes
  document.querySelectorAll('#category-container .include-checkbox').forEach(checkbox => {
    checkbox.checked = false;
  });
  document.querySelectorAll('#category-container .exclude-checkbox').forEach(checkbox => {
    checkbox.checked = false;
  });

  // Uncheck hide options
  document.getElementById('hide-offensive').checked = false;
  document.getElementById('hide-historical').checked = false;

  updateTagContainer();
  updateSelectedCategories();
  performSearch();
});

// Event listeners for the hide options checkboxes
document.getElementById('hide-offensive').addEventListener('change', () => {
  hideOffensive = document.getElementById('hide-offensive').checked;
  performSearch();
});

document.getElementById('hide-historical').addEventListener('change', () => {
  hideHistorical = document.getElementById('hide-historical').checked;
  performSearch();
});

// Event listener for the search bar input (handle tags)
document.getElementById('search-bar').addEventListener('keydown', function(event) {
  if (event.key === ',' || event.key === 'Enter') {
    event.preventDefault();
    let input = this.value.trim();

    // Check if input starts with ':' and has no spaces
    if (input.startsWith(':') && !input.includes(' ')) {
      addTag(input.substring(1));
      this.value = '';
    }
  }
});

document.getElementById('search-bar').addEventListener('input', function() {
  performSearch();
});

// Function to add a tag
function addTag(input) {
  if (input === '') return;

  // Remove spaces from input
  input = input.replace(/\s/g, '');

  // Check if input matches a registered category
  let found = false;
  for (const group in categoriesData) {
    for (const key in categoriesData[group]) {
      if (`${group}:${key}`.toLowerCase() === input.toLowerCase()) {
        tags.push({ id: `${group}:${key}`, name: categoriesData[group][key].name });
        found = true;
        break;
      }
    }
    if (found) break;
  }

  if (!found) {
    // If not found, add as custom tag
    tags.push({ id: input, name: input });
  }

  updateTagContainer();
  performSearch();
}

// Function to update the tag container
function updateTagContainer() {
  const tagContainer = document.getElementById('tag-container');
  tagContainer.innerHTML = '';

  tags.forEach((tag, index) => {
    const tagElement = document.createElement('div');
    tagElement.className = 'tag';
    tagElement.textContent = tag.name;

    const removeIcon = document.createElement('span');
    removeIcon.className = 'remove-tag';
    removeIcon.textContent = '×';
    removeIcon.addEventListener('click', () => {
      tags.splice(index, 1);
      updateTagContainer();
      performSearch();
    });

    tagElement.appendChild(removeIcon);
    tagContainer.appendChild(tagElement);
  });
}

// Close popup when clicking outside the content
document.getElementById('popup-overlay').addEventListener('click', function(event) {
  if (event.target === this) {
    closePopup();
  }
});

// Function to update the total flags counter
function updateTotalFlagsCounter() {
  const totalFlagsCounter = document.getElementById('total-flags-counter');

  // Total number of registered flags
  const totalFlags = Object.keys(flagsData).length;
  totalFlagsCounter.innerHTML = `<span>${totalFlags} Flags Registered</span>`;

  // Prepare tooltip content
  const tooltipDiv = document.createElement('div');
  tooltipDiv.className = 'tooltip';

  const tooltipTitle = document.createElement('h4');
  tooltipTitle.textContent = 'Flags by Region:';
  tooltipDiv.appendChild(tooltipTitle);

  // Count flags per region
  const regionCounts = {};

  for (const flagKey in flagsData) {
    const flag = flagsData[flagKey];
    const categories = flag.cat.replace(/\s/g, '').split(',');
    const regionCategories = categories.filter(cat => cat.startsWith('region:'));
    const regions = regionCategories.map(cat => cat.split(':')[1]);

    if (regions.length === 0) {
      // No region found, count under 'other'
      regions.push('other');
    }

    regions.forEach(regionKey => {
      regionCounts[regionKey] = (regionCounts[regionKey] || 0) + 1;
    });
  }

  // Get region names from categoriesData
  for (const regionKey in regionCounts) {
    const regionName = categoriesData.region && categoriesData.region[regionKey]?.name
      ? categoriesData.region[regionKey].name
      : capitalizeFirstLetter(regionKey);
    const count = regionCounts[regionKey];

    const regionInfo = document.createElement('p');
    regionInfo.textContent = `${regionName}: ${count}`;
    tooltipDiv.appendChild(regionInfo);
  }

  totalFlagsCounter.appendChild(tooltipDiv);
}

// Event listener for the force reload button
document.getElementById('force-reload-button').addEventListener('click', () => {
  // Clear cached data
  categoriesData = {};
  flagsData = {};
  includedCategories = [];
  excludedCategories = [];
  tags = [];
  nameSearchQuery = '';
  hideOffensive = true; // Reset to default
  hideHistorical = false; // Reset to default
  document.getElementById('search-bar').value = '';
  updateTagContainer();

  // Uncheck all include and exclude checkboxes
  document.querySelectorAll('#category-container .include-checkbox').forEach(checkbox => {
    checkbox.checked = false;
  });
  document.querySelectorAll('#category-container .exclude-checkbox').forEach(checkbox => {
    checkbox.checked = false;
  });

  // Uncheck hide options
  document.getElementById('hide-offensive').checked = true; // Set to default
  document.getElementById('hide-historical').checked = false; // Set to default

  updateSelectedCategories();
  performSearch();

  // Reload data
  loadData();
});

// Load data on page load
window.onload = loadData;