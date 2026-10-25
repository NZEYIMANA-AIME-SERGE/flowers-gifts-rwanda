// ==========================================
// FLOWERS & GIFTS RWANDA
// FRONTEND APP
// ==========================================


// ==========================================
// CART
// ==========================================

let cart = JSON.parse(
    localStorage.getItem("cart") || "[]"
);


// ==========================================
// BACKEND API
// ==========================================

const API_URL = "https://flowers-gifts-rwanda.onrender.com";
const PUBLIC_SITE_URL = "https://flowerandgiftsrwanda.onrender.com";


// ==========================================
// WHATSAPP ORDER NUMBER
// ==========================================

const WHATSAPP_NUMBER = "250780274472";


// ==========================================
// MONEY FORMAT
// ==========================================

const money = n =>
    new Intl.NumberFormat("en-RW").format(n) + " RWF";


// ==========================================
// LOAD PRODUCTS FROM MONGODB
// ==========================================

async function loadMongoProducts() {

    try {

        const response = await fetch(
            `${API_URL}/api/products`
        );


        if (!response.ok) {

            throw new Error(
                `Server returned ${response.status}`
            );

        }


        const data =
            await response.json();


        if (!data.success) {

            console.error(
                "Could not load products from MongoDB."
            );

            return false;

        }


        // ==========================================
        // CONVERT MONGODB PRODUCTS
        // TO FRONTEND FORMAT
        // ==========================================

        const databaseProducts =
            data.products

                .filter(
                    product =>
                        product.available !== false
                )

                .map(
                    (product, index) => {

                        const productImages = Array.isArray(product.images)
                            ? product.images.filter(Boolean)
                            : [];

                        const productVariations = Array.isArray(product.variations)
                            ? product.variations
                            : [];

                        const firstVariationImage = productVariations
                            .flatMap(variation =>
                                Array.isArray(variation?.images)
                                    ? variation.images
                                    : []
                            )
                            .find(Boolean);

                        const storefrontImage =
                            product.image ||
                            productImages[0] ||
                            firstVariationImage ||
                            "";

                        return {

                            // Simple frontend ID
                            id: index + 1,

                            // Real MongoDB ID
                            mongoId:
                                product._id,

                            name:
                                product.name,

                            category:
                                product.category || "",

                            occasion:
                                product.occasion || "",

                            price:
                                product.price,

                            description:
                                product.description || "",

                            image:
                                storefrontImage,

                            images:
                                productImages,

                            variationType:
                                product.variationType || "none",

                            variations:
                                productVariations,

                            emoji:
                                storefrontImage
                                    ? ""
                                    : "🎁",

                            stock:
                                product.stock ?? 0,

                            available:
                                product.available !== false

                        };

                    }
                );


        // ==========================================
        // REPLACE FRONTEND PRODUCTS
        // WITH MONGODB PRODUCTS
        // ==========================================

        products =
            databaseProducts;


        console.log(
            "Products loaded from MongoDB:",
            products
        );


        return true;


    } catch (error) {

        console.error(
            "Could not connect to product database:",
            error
        );


        console.log(
            "Using local fallback products."
        );


        return false;

    }

}

renderFlowerOccasionImages();


// ==========================================
// SAVE CART
// ==========================================

function save() {

    localStorage.setItem(
        "cart",
        JSON.stringify(cart)
    );


    updateCount();

}


// ==========================================
// UPDATE CART COUNT
// ==========================================

function updateCount() {

    document
        .querySelectorAll("#cart-count")
        .forEach(element => {

            element.textContent =
                cart.reduce(
                    (sum, item) =>
                        sum + item.quantity,
                    0
                );

        });

}

function getStorefrontProductOptions(product) {
    const variations = Array.isArray(product?.variations)
        ? product.variations
        : [];

    if (!variations.length) return [];

    const variationImageUrls = variations.flatMap(variation =>
        Array.isArray(variation?.images) ? variation.images : []
    );
    const mainImages = [
        ...(Array.isArray(product.images) ? product.images : []),
        product.image
    ].filter((image, index, images) => image && images.indexOf(image) === index);
    const hasSeparateMainPhoto =
        (Array.isArray(product.images) && product.images.some(Boolean)) ||
        (product.image && !variationImageUrls.includes(product.image));

    return [
        ...(hasSeparateMainPhoto
            ? [{
                name: "Main photo",
                value: "__main_image__",
                type: "Photo",
                images: mainImages
            }]
            : []),
        ...variations
            .filter(variation => variation && typeof variation.name === "string")
            .map(variation => ({
                name: variation.name,
                value: variation.name,
                type: product.variationType || "Option",
                images: Array.isArray(variation.images) ? variation.images : []
            }))
    ];
}


// ==========================================
// ADD PRODUCT TO CART
// ==========================================

function addToCart(id, variationName = "") {

    const product = products.find(
        product => product.id === id
    );


    if (!product) {

        alert("Product not found.");

        return;

    }


    // ==========================================
    // CHECK AVAILABILITY
    // ==========================================

    if (product.available === false) {

        alert(
            "Sorry, this product is currently unavailable."
        );

        return;

    }

    const hasVariations =
        Array.isArray(product.variations) &&
        product.variations.length > 0;

    const productOptions = getStorefrontProductOptions(product);

    if (hasVariations && !variationName) {
        variationName = productOptions[0]?.value || "";
    }

    const selectedOption = hasVariations
        ? productOptions.find(option => option.value === variationName)
        : null;

    if (hasVariations && !selectedOption) {
        alert("Please choose a valid product option.");
        return;
    }

    const currentPhoto = document.querySelector("[data-product-main-image]")?.src;
    const selectedOptionImages = selectedOption?.images || [];
    const cartImage = selectedOption
        ? (selectedOptionImages.includes(currentPhoto)
            ? currentPhoto
            : selectedOptionImages[0] || product.image || "")
        : (product.image || "");


    // ==========================================
    // CHECK IF PRODUCT IS ALREADY IN CART
    // ==========================================

    const existingItem =
        cart.find(
            item =>
                item.id === id &&
                (item.selectedOptionValue || "") === (selectedOption?.value || "")
        );


    if (existingItem) {

        existingItem.quantity++;

    } else {

        cart.push({

            ...product,

            ...(selectedOption
                ? {
                    variationName: selectedOption.name,
                    variationType: selectedOption.type,
                    selectedOptionValue: selectedOption.value,
                    image: cartImage,
                    variationImages: selectedOption.images || []
                }
                : {}),

            quantity: 1

        });

    }


    save();


    alert("Added to cart!");

}



 // ==========================================
 // PRODUCT CARD
 // ==========================================

function card(product) {
    const hasVariations =
        Array.isArray(product.variations) &&
        product.variations.length > 0;
    const productOptions = getStorefrontProductOptions(product);

    const productVisual = product.image
        ? `
            <img
                src="${product.image}"
                alt="${product.name}"
                loading="lazy"
                decoding="async"
                data-card-product-image="${product.id}"
            >
          `
        : `
            <div class="product-placeholder">
                ${product.emoji || "🎁"}
            </div>
          `;

    const isFlower =
        (product.category || "").toLowerCase().trim() === "flowers";
    const variationLabel = {
        color: "Choose a color",
        size: "Choose a size",
        arrangement: "Choose an arrangement"
    }[product.variationType] || "Choose an option";
    const priceHTML = getStorePriceHTML(product);

    return `
        <article class="product-card">
            <div class="product-image">
                ${productVisual}
            </div>

            <div class="product-info">
                <h3>${product.name}</h3>

                <p>${product.description}</p>

                ${priceHTML ? `<strong class="product-price">${priceHTML}</strong>` : ""}

                ${hasVariations ? `
                    <label class="card-variation-label" for="card-variation-${product.id}">${variationLabel}</label>
                    <select class="card-variation-select" id="card-variation-${product.id}"
                        onchange="updateCardVariationPhoto(${product.id}, this.value)">
                        ${productOptions.map((option, index) => `
                            <option value="${option.value}"${index === 0 ? " selected" : ""}>${option.name}</option>
                        `).join("")}
                    </select>
                ` : ""}

                ${
                    isFlower
                        ? `
                            <div class="product-actions">
                                <button
                                    class="add-btn"
                                    onclick="addToCart(${product.id}, document.getElementById('card-variation-${product.id}')?.value || '')"
                                >
                                    Add to Cart
                                </button>

                                <a
                                    class="flower-whatsapp-btn"
                                    href="#"
                                    onclick="orderProductViaWhatsApp(${product.id}); return false;"
                                    aria-label="Order ${product.name} via WhatsApp"
                                >
                                    <span class="whatsapp-icon">💬</span>
                                    <span>Order Now</span>
                                </a>
                            </div>
                          `
                        : `
                            <button
                                class="add-btn"
                                onclick="addToCart(${product.id}, document.getElementById('card-variation-${product.id}')?.value || '')"
                            >
                                Add to Cart
                            </button>
                          `
                }

                <a
                    class="details"
                    href="product.html?id=${encodeURIComponent(product.mongoId || product.id)}"
                >
                    View details →
                </a>
            </div>
        </article>
    `;
}

function updateCardVariationPhoto(productId, variationName) {
    const product = products.find(item => item.id === productId);
    const option = getStorefrontProductOptions(product)
        .find(item => item.value === variationName);
    const image = document.querySelector(`[data-card-product-image="${productId}"]`);
    const nextImage = option?.images?.find(Boolean);

    if (image && nextImage) {
        image.src = nextImage;
        image.alt = `${product.name} - ${option.name}`;
    }
}

function orderProductViaWhatsApp(productId) {
    const product = products.find(item => item.id === productId);
    if (!product) return;

    const optionValue = document.getElementById(`card-variation-${productId}`)?.value || "";
    const option = getStorefrontProductOptions(product)
        .find(item => item.value === optionValue);
    const image = option?.images?.find(Boolean) || product.image || "";
    const isFlower = (product.category || "").toLowerCase().trim() === "flowers";

    let message = "Hello Flowers & Gifts Rwanda! 🌸\n\nI would like to order this product:\n";
    message += `Name: ${product.name}\n`;
    if (option) message += `${option.type}: ${option.name}\n`;
    message += "Quantity: 1\n";
    message += isFlower
        ? "Price: To be discussed\n"
        : `Price: ${product.price || "To be discussed"}\n`;
    if (image) message += `Product image: ${image}\n`;
    message += "\nPlease let me know the delivery details. Thank you!";

    const whatsappURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(whatsappURL, "_blank", "noopener,noreferrer");
}


// ==========================================
// FEATURED / POPULAR PRODUCTS
// ==========================================

function renderFeatured() {

    const element =
        document.getElementById(
            "featured-products"
        );


    if (!element) {

        return;

    }


    const availableProducts =
        products.filter(
            product =>
                product.available !== false
        );


        
    element.innerHTML =
        availableProducts.length

            ? availableProducts
                .slice(0, 8)
                .map(card)
                .join("")

            : "<p>No products are currently available.</p>";

}


// ==========================================
// FLOWERS BY OCCASION
// ==========================================

function filterFlowersByOccasion(
    occasion,
    button
) {

    console.log(
        "Occasion clicked:",
        occasion
    );


    // ==========================================
    // REMOVE ACTIVE STATE
    // ==========================================

    document
        .querySelectorAll(".occasion-btn")
        .forEach(btn => {

            btn.classList.remove("active");

        });


    // ==========================================
    // ACTIVATE CLICKED BUTTON
    // ==========================================

    if (button) {

        button.classList.add("active");

    }


    // ==========================================
    // FIND HOMEPAGE FLOWER CONTAINER
    // ==========================================

    const element =
        document.getElementById(
            "homepage-flowers"
        );


    if (!element) {

        console.error(
            "Homepage flower container not found."
        );

        return;

    }


    // ==========================================
    // GET AVAILABLE FLOWERS
    // ==========================================

    let filteredFlowers =
        products.filter(
            product => {

                const category =
                    (product.category || "")
                        .toLowerCase()
                        .trim();

                return (
                    product.available !== false &&
                    category === "flowers"
                );

            }
        );


    // ==========================================
    // FILTER BY OCCASION
    // ==========================================

    if (occasion !== "all" && occasion !== "") {

        const selectedOccasion =
            (occasion || "")
                .toLowerCase()
                .trim();


        filteredFlowers =
            filteredFlowers.filter(
                product => {

                    const productOccasion =
                        (product.occasion || "")
                            .toLowerCase()
                            .trim();

                    return (
                        productOccasion ===
                        selectedOccasion
                    );

                }
            );

    }


    // ==========================================
    // DISPLAY FILTERED FLOWERS
    // ==========================================

    if (!filteredFlowers.length) {

        element.innerHTML = `

            <div class="empty-cart">

                <p>
                    No flowers are currently available
                    for this occasion.
                </p>

            </div>

        `;

        return;

    }


   element.innerHTML =
    shuffleProducts(filteredFlowers)
        .map(card)
        .join("");

}




function renderFlowerOccasionImages() {
    document.querySelectorAll(".occasion-icon[data-occasion]")
        .forEach(icon => {
            const occasion = icon.dataset.occasion.toLowerCase().trim();

            const matchingFlower = products.find(product =>
                (product.category || "").toLowerCase().trim() === "flowers" &&
                (product.occasion || "").toLowerCase().trim() === occasion &&
                product.available !== false &&
                typeof product.image === "string" &&
                product.image.trim() !== ""
            );

            if (!matchingFlower) {
                // Keep the original emoji already inside the element.
                return;
            }

            const img = document.createElement("img");
            img.src = matchingFlower.image;
            img.alt = `${occasion} flowers`;
            img.loading = "lazy";

            img.onerror = () => {
                // Restore the original emoji if the image URL fails.
                icon.textContent = {
                    birthday: "🎂",
                    romance: "❤️",
                    graduation: "🎓",
                    wedding: "💐",
                    sympathy: "🕊️",
                    "thank-you": "💝",
                    "just-because": "🌷"
                }[occasion] || "🌸";
            };

            icon.replaceChildren(img);
        });
}


// ==========================================
// HOMEPAGE FLOWERS
// ==========================================

function renderHomepageFlowers() {

    const flowerContainer =
        document.getElementById(
            "homepage-flowers"
        );


    if (!flowerContainer) {

        return;

    }


 
const flowers = shuffleProducts(
    products.filter(
        product => {
            const category =
                (product.category || "")
                    .toLowerCase()
                    .trim();

            return (
                product.available !== false &&
                category === "flowers"
            );
        }
    )
);



    if (!flowers.length) {

        flowerContainer.innerHTML = `

            <div class="empty-cart">

                <p>
                    No flowers are available right now.
                </p>

            </div>

        `;

        return;

    }


    flowerContainer.innerHTML =
        flowers
            .map(card)
            .join("");

}


/* ==========================================
   ANIMATED FEATURED GALLERIES
========================================== */

let featuredFlowers = [];
let featuredGifts = [];

let flowerGalleryIndex = 0;
let giftGalleryIndex = 0;



/* ==========================================
   FORMAT PRICE
========================================== */

function formatGalleryPrice(price) {
    if (
        price === null ||
        price === undefined ||
        String(price).trim() === ""
    ) {
        return "";
    }

    const amount = Number(
        String(price).replace(/,/g, "").replace(/\s*RWF$/i, "").trim()
    );

    if (!Number.isFinite(amount)) {
        return String(price).trim();
    }

    return amount.toLocaleString("en-RW") + " RWF";
}

/* ==========================================
   shuffling the products
========================================== */


function shuffleProducts(items) {
    const shuffled = [...items];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [shuffled[i], shuffled[j]] =
            [shuffled[j], shuffled[i]];
    }

    return shuffled;
}



/* ==========================================
   STOREFRONT PRICE DISPLAY
========================================== */

function getStorePriceHTML(product) {
    // Display a price only when one has been entered for the product.
    return formatGalleryPrice(product.price);
}


/* ==========================================
   SHOW FEATURED FLOWER
========================================== */

function showFeaturedFlower(product) {

    const image =
        document.getElementById(
            "featured-flower-image"
        );

    const name =
        document.getElementById(
            "featured-flower-name"
        );

    const description =
        document.getElementById(
            "featured-flower-description"
        );

    const price =
        document.getElementById(
            "featured-flower-price"
        );

    const button =
        document.getElementById(
            "featured-flower-button"
        );

    const category =
        document.getElementById(
            "featured-flower-category"
        );


    if (!image || !product) {
        return;
    }


    /* Fade out */

    image.classList.add("fade-out");
    image.loading = "lazy";
    image.decoding = "async";


    setTimeout(() => {

        image.src =
            product.image || "";

        image.alt =
            product.name || "Featured flower";


        if (name) {
            name.textContent =
                product.name || "";
        }


        if (description) {
            description.textContent =
                product.description || "";
        }


        if (price) {
            price.textContent = getStorePriceHTML(product);
            price.style.display = price.textContent ? "" : "none";
        }


        if (category) {
            category.textContent =
                product.category || "Flowers";
        }


        if (button) {

            button.onclick = function () {

                if (product.mongoId) {

                    window.location.href =
                        `product.html?id=${encodeURIComponent(product.mongoId)}`;

                }

            };

        }


        image.classList.remove("fade-out");

        image.classList.add("zooming");


        setTimeout(() => {

            image.classList.remove(
                "zooming"
            );

        }, 5000);


    }, 700);

}


/* ==========================================
   SHOW FEATURED GIFT
========================================== */

function showFeaturedGift(product) {

    const image =
        document.getElementById(
            "featured-gift-image"
        );

    const name =
        document.getElementById(
            "featured-gift-name"
        );

    const description =
        document.getElementById(
            "featured-gift-description"
        );

    const price =
        document.getElementById(
            "featured-gift-price"
        );

    const button =
        document.getElementById(
            "featured-gift-button"
        );

    const category =
        document.getElementById(
            "featured-gift-category"
        );


    if (!image || !product) {
        return;
    }


    /* Fade out */

    image.classList.add("fade-out");
    image.loading = "lazy";
    image.decoding = "async";


    setTimeout(() => {

        image.src =
            product.image || "";

        image.alt =
            product.name || "Featured gift";


        if (name) {
            name.textContent =
                product.name || "";
        }


        if (description) {
            description.textContent =
                product.description || "";
        }


        if (price) {
    price.textContent =
        getStorePriceHTML(product);

    price.style.display =
        price.textContent ? "" : "none";
}


        if (category) {
            category.textContent =
                product.category || "Gift";
        }


        if (button) {

            button.onclick = function () {

                if (product.mongoId) {

                    window.location.href =
                        `product.html?id=${encodeURIComponent(product.mongoId)}`;

                }

            };

        }


        image.classList.remove("fade-out");

        image.classList.add("zooming");


        setTimeout(() => {

            image.classList.remove(
                "zooming"
            );

        }, 5000);


    }, 700);

}


/* ==========================================
   START FLOWER GALLERY
========================================== */

function startFlowerGallery() {

    if (!featuredFlowers.length) {
        return;
    }


    showFeaturedFlower(
        featuredFlowers[flowerGalleryIndex]
    );


    setInterval(() => {

        flowerGalleryIndex++;

        if (
            flowerGalleryIndex >=
            featuredFlowers.length
        ) {

            flowerGalleryIndex = 0;

        }


        showFeaturedFlower(
            featuredFlowers[flowerGalleryIndex]
        );

    }, 5000);

}


/* ==========================================
   START GIFT GALLERY
========================================== */

function startGiftGallery() {

    if (!featuredGifts.length) {
        return;
    }


    showFeaturedGift(
        featuredGifts[giftGalleryIndex]
    );


    setInterval(() => {

        giftGalleryIndex++;

        if (
            giftGalleryIndex >=
            featuredGifts.length
        ) {

            giftGalleryIndex = 0;

        }


        showFeaturedGift(
            featuredGifts[giftGalleryIndex]
        );

    }, 5000);

}


/* ==========================================
   INITIALIZE FEATURED GALLERIES
========================================== */

function initializeFeaturedGalleries() {

    console.log("Initializing featured galleries...");
    console.log("Products available:", products);


    featuredFlowers =
        products.filter(product => {

            const category =
                (product.category || "")
                    .toLowerCase()
                    .trim();

            return (
                product.available !== false &&
                category === "flowers" &&
                product.image
            );

        });


    featuredGifts =
        products.filter(product => {

            const category =
                (product.category || "")
                    .toLowerCase()
                    .trim();

            return (
                product.available !== false &&
                category !== "flowers" &&
                product.image
            );

        });


    console.log(
        "Featured flowers:",
        featuredFlowers
    );

    console.log(
        "Featured gifts:",
        featuredGifts
    );


    if (featuredFlowers.length > 0) {

        flowerGalleryIndex = 0;

        showFeaturedFlower(
            featuredFlowers[0]
        );

        startFlowerGallery();

    } else {

        console.log(
            "No flower products with images found."
        );

    }


    if (featuredGifts.length > 0) {

        giftGalleryIndex = 0;

        showFeaturedGift(
            featuredGifts[0]
        );

        startGiftGallery();

    } else {

        console.log(
            "No gift products with images found."
        );

    }

}
// ==========================================
// SHOP PAGE
// ==========================================

function renderShop() {

    const container =
        document.getElementById(
            "shop-products"
        );


    if (!container) {

        return;

    }

    renderShopCategories();

    // ==========================================
    // GET CATEGORY FROM URL
    // ==========================================

    const params =
        new URLSearchParams(
            window.location.search
        );


    const urlCategory =
        params.get("category") || "";
    const urlOccasion = params.get("occasion") || "";


    // ==========================================
    // GET SEARCH
    // ==========================================

    const searchElement =
        document.getElementById(
            "search"
        );


    const search =
        searchElement

            ? searchElement.value
                .toLowerCase()
                .trim()

            : "";


    // ==========================================
    // GET CATEGORY SELECTOR
    // ==========================================

    const categoryElement =
        document.getElementById(
            "category"
        );


    const selectedCategory =
        categoryElement

            ? categoryElement.value

            : urlCategory;


    const category =
        selectedCategory ||
        urlCategory;


    // ==========================================
    // FILTER PRODUCTS
    // ==========================================

    let filteredProducts =
        products.filter(
            product =>
                product.available !== false
        );


    // ==========================================
    // CATEGORY FILTER
    // ==========================================

    if (category) {

        filteredProducts =
            filteredProducts.filter(
                product => {

                    const productCategory =
                        (product.category || "")
                            .toLowerCase()
                            .trim();


                   const normalizedProductCategory =
    productCategory === "fashion"
        ? "shoes-and-bags"
        : productCategory;

return (
    normalizedProductCategory ===
    category.toLowerCase().trim()
);

                }
            );

    }

    if (category.toLowerCase().trim() === "flowers" && urlOccasion) {
        filteredProducts = filteredProducts.filter(product =>
            String(product.occasion || "").toLowerCase().trim() === urlOccasion
        );
    }


    // ==========================================
    // SEARCH FILTER
    // ==========================================

    if (search) {

        filteredProducts =
            filteredProducts.filter(
                product => {

                    const name =
                        (product.name || "")
                            .toLowerCase();


                    const description =
                        (product.description || "")
                            .toLowerCase();


                    return (
                        name.includes(search) ||
                        description.includes(search)
                    );

                }
            );

    }


    // ==========================================
    // UPDATE PAGE TITLE
    // ==========================================

    const titleElement =
        document.getElementById(
            "shop-title"
        );


    const descriptionElement =
        document.getElementById(
            "shop-description"
        );


   
const categoryNames = {
    flowers: "Flowers",
    chocolates: "Chocolates",
    "shoes-and-bags": "Shoes & Bags",
    cakes: "Cakes",
    "teddy-bears": "Teddy Bears",
    jewelry: "Jewelry"
};


    if (titleElement) {

        if (category) {

            titleElement.textContent =
                `Shop ${
                    categoryNames[category] ||
                    category
                }`;

        } else {

            titleElement.textContent =
                "Shop";

        }

    }


    if (descriptionElement) {

        if (category) {

            descriptionElement.textContent =
                `Explore our ${
                    categoryNames[category] ||
                    category
                } collection.`;

        } else {

            descriptionElement.textContent =
                "Find the perfect flowers or gift for every special moment.";

        }

    }

    const categoryLabel = category
        ? (categoryNames[category] || category)
        : "flowers and gifts";
    document.title = category
        ? `Shop ${categoryLabel} in Rwanda | Flowers & Gifts Rwanda`
        : "Shop Flowers & Gifts in Rwanda | Flowers & Gifts Rwanda";
    setMetaDescription(category
        ? `Browse ${categoryLabel.toLowerCase()} from Flowers & Gifts Rwanda. View product photos, options, and details.`
        : "Browse flowers, bouquets, chocolates, gift boxes, and other gifts in Rwanda from Flowers & Gifts Rwanda.");
    setCanonicalURL(`${PUBLIC_SITE_URL}/shop.html`);


    // ==========================================
    // KEEP SELECTOR IN SYNC WITH URL
    // ==========================================

    if (
        categoryElement &&
        category
    ) {

        categoryElement.value =
            category;

        categoryElement.hidden = category.toLowerCase().trim() === "flowers";

    } else if (categoryElement) {
        categoryElement.hidden = false;

    }


    // ==========================================
    // DISPLAY PRODUCTS
    // ==========================================

    if (!filteredProducts.length) {

        container.innerHTML = `

            <div class="empty-cart">

                <p>
                    No products found in this category.
                </p>


                <a href="shop.html">
                    View all products →
                </a>

            </div>

        `;

        return;

    }


    container.innerHTML =
        filteredProducts
            .map(product => card(product))
            .join("");


    // ==========================================
    // CATEGORY CHANGE
    // ==========================================

    if (categoryElement) {

        categoryElement.onchange =
            function () {

                const newCategory =
                    this.value;


                if (newCategory) {

                    window.location.href =
                        `shop.html?category=${
                            encodeURIComponent(
                                newCategory
                            )
                        }`;

                } else {

                    window.location.href =
                        "shop.html";

                }

            };

    }


    // ==========================================
    // SEARCH
    // ==========================================

    if (searchElement) {

        searchElement.oninput =
            function () {

                renderShop();

            };

    }

}



function renderShopCategories() {
    const container = document.getElementById("shop-categories");

    if (!container) return;

    const categories = [
        { value: "flowers", name: "Flowers", emoji: "🌹" },
        { value: "chocolates", name: "Chocolates", emoji: "🍫" },
        { value: "shoes-and-bags", name: "Shoes & Bags", emoji: "👟" },
        { value: "cakes", name: "Cakes", emoji: "🎂" },
        { value: "teddy-bears", name: "Teddy Bears", emoji: "🧸" },
        { value: "jewelry", name: "Jewelry", emoji: "💎" },
        
  {
    value: "champagne-and-wines",
    name: "Champagne & Wines",
    emoji: "🍾"
}
    ];

    const params = new URLSearchParams(window.location.search);
    const selectedCategory = params.get("category") || "";
    const selectedOccasion = params.get("occasion") || "";

    if (selectedCategory.toLowerCase().trim() === "flowers") {
        const flowerOccasions = [
            { value: "", name: "All Flowers", emoji: "🌸" },
            { value: "birthday", name: "Birthday", emoji: "🎂" },
            { value: "romance", name: "Romance", emoji: "❤️" },
            { value: "graduation", name: "Graduation", emoji: "🎓" },
            { value: "wedding", name: "Wedding", emoji: "💐" },
            { value: "baby-boy", name: "Baby Boy", emoji: "💙" },
            { value: "baby-girl", name: "Baby Girl", emoji: "💗" },
            { value: "sympathy", name: "Sympathy", emoji: "🕊️" },
            { value: "thank-you", name: "Thank You", emoji: "💝" },
            { value: "just-because", name: "Just Because", emoji: "🌷" }
        ];
        container.classList.add("shop-flower-ribbons");
        container.innerHTML = flowerOccasions.map(occasion => `
            <a class="shop-flower-ribbon${selectedOccasion === occasion.value ? " active" : ""}"
                href="shop.html?category=flowers${occasion.value ? `&occasion=${encodeURIComponent(occasion.value)}` : ""}">
                <span aria-hidden="true">${occasion.emoji}</span>${occasion.name}
            </a>
        `).join("");
        return;
    }

    container.classList.remove("shop-flower-ribbons");

    container.innerHTML = categories.map(category => {
        // Support older products still categorized as "fashion".
        const matchingProduct = products.find(product => {
            const storedCategory = String(product.category || "")
                .trim()
                .toLowerCase();

            const normalizedCategory =
                storedCategory === "fashion"
                    ? "shoes-and-bags"
                    : storedCategory;

            return normalizedCategory === category.value
                && product.available !== false
                && product.image;
        });

        const imageHTML = matchingProduct
            ? `<img src="${matchingProduct.image}" alt="${matchingProduct.name || category.name}" loading="lazy" decoding="async">`
            : `<span class="shop-category-emoji">${category.emoji}</span>`;

        const isActive = selectedCategory === category.value;

        return `
            <button
                type="button"
                class="shop-category ${isActive ? "active" : ""}"
                data-category="${category.value}"
                aria-pressed="${isActive}"
            >
                <span class="shop-category-image">
                    ${imageHTML}
                </span>
                <span class="shop-category-name">
                    ${category.name}
                </span>
            </button>
        `;
    }).join("");

    container.querySelectorAll(".shop-category").forEach(button => {
        button.addEventListener("click", () => {
            const category = button.dataset.category;

            window.location.href =
                `shop.html?category=${encodeURIComponent(category)}`;
        });
    });
}


// ==========================================
// PRODUCT DETAILS PAGE
// ==========================================

function renderProduct() {

    const params =
        new URLSearchParams(
            location.search
        );


    const requestedId = params.get("id") || "";
    const usesLocalFallbackProducts = products.every(product => !product.mongoId);
    const product = products.find(item =>
        item.mongoId && String(item.mongoId) === requestedId
    ) || (
        usesLocalFallbackProducts && /^\d+$/.test(requestedId)
            ? products.find(item => item.id === Number(requestedId))
            : null
    );


    const element =
        document.getElementById(
            "product-detail"
        );


    if (!element) return;

    if (!product) {
        updateProductSEO(null);
        element.innerHTML = `
            <div class="empty-cart">
                <h1>Product not found</h1>
                <p>This product may no longer be available. Browse the current collection instead.</p>
                <a href="shop.html">Browse flowers and gifts →</a>
            </div>
        `;
        return;
    }

    updateProductSEO(product);


    const variations = Array.isArray(product.variations)
        ? product.variations.filter(variation =>
            variation && typeof variation.name === "string"
        )
        : [];
    const productOptions = getStorefrontProductOptions(product);
    const firstVariation = variations[0];
    const firstVariationImages = Array.isArray(firstVariation?.images)
        ? firstVariation.images
        : [];
    const regularImages = [
        ...(Array.isArray(product.images) ? product.images : []),
        product.image
    ].filter((image, index, images) => image && images.indexOf(image) === index);
    const initialImages = [...regularImages, ...firstVariationImages]
        .filter((image, index, images) => image && images.indexOf(image) === index);
    const initialImage = regularImages[0] || firstVariationImages[0] || "";
    const imageMarkup = initialImage
        ? `<img class="product-detail-main-image" src="${initialImage}" alt="${product.name}" data-product-main-image>`
        : `<div class="product-placeholder product-detail-placeholder">${product.emoji || "🎁"}</div>`;
    const optionLabel = {
        color: "Choose a color",
        size: "Choose a size",
        arrangement: "Choose an arrangement"
    }[product.variationType] || "Choose an option";
    const priceHTML = getStorePriceHTML(product);


    element.innerHTML = `

        <div class="product-detail">

            <div class="detail-art product-detail-gallery">
                ${imageMarkup}
            </div>


            <div>

                <span class="eyebrow">

                    ${product.category}

                </span>


                <h1>

                    ${product.name}

                </h1>


                <p>

                    ${product.description}

                </p>

                ${variations.length ? `
                    <label class="product-variation-label" for="product-variation-select">${optionLabel}</label>
                    <select id="product-variation-select" class="product-variation-select"
                        onchange="selectProductVariation(${product.id}, this.value)">
                        ${productOptions.map((option, index) => `
                            <option value="${option.value}"${index === 0 ? " selected" : ""}>${option.name}</option>
                        `).join("")}
                    </select>
                ` : ""}

                <div id="product-variation-photos" class="product-detail-thumbnails" aria-label="Selected option photos">
                    ${initialImages.length > 1 ? initialImages.map((image, index) => `
                        <button type="button" class="product-detail-thumbnail${index === 0 ? " is-active" : ""}" data-photo="${image}"
                            aria-label="Show option photo ${index + 1}">
                            <img src="${image}" alt="${product.name} product photo ${index + 1}" loading="lazy" decoding="async">
                        </button>
                    `).join("") : ""}
                </div>


                ${priceHTML ? `<h2 class="product-price">${priceHTML}</h2>` : ""}

                <p>

                    ${
                        product.available !== false

                            ? "Available"

                            : "Currently unavailable"

                    }

                </p>


                <button
                    class="btn primary"
                    onclick="addToCart(${product.id}, document.getElementById('product-variation-select')?.value || '')"

                    ${
                        product.available === false
                            ? "disabled"
                            : ""
                    }
                >

                    ${
                        product.available === false
                            ? "Unavailable"
                            : "Add to Cart"
                    }

                </button>

            </div>

        </div>

    `;

    element.querySelectorAll(".product-detail-thumbnail").forEach(button => {
        button.addEventListener("click", () => selectProductPhoto(button));
    });

}

function updateProductSEO(product) {
    const title = product
        ? `${product.name} | Flowers & Gifts Rwanda`
        : "Product not found | Flowers & Gifts Rwanda";
    const description = product
        ? (product.description || `View photos and details for ${product.name} from Flowers & Gifts Rwanda.`)
        : "This product could not be found. Browse flowers, bouquets, and gifts from Flowers & Gifts Rwanda.";

    document.title = title;
    setMetaDescription(description);

    let canonicalURL = null;
    if (product?.mongoId) {
        canonicalURL = new URL("/product.html", PUBLIC_SITE_URL);
        canonicalURL.searchParams.set("id", String(product.mongoId));
        setCanonicalURL(canonicalURL.href);
    } else {
        setCanonicalURL(null);
    }

    let structuredData = document.getElementById("product-structured-data");
    if (!product) {
        structuredData?.remove();
        return;
    }

    if (!product.mongoId) {
        structuredData?.remove();
        return;
    }

    const images = [
        product.image,
        ...(Array.isArray(product.images) ? product.images : []),
        ...(Array.isArray(product.variations)
            ? product.variations.flatMap(option => Array.isArray(option?.images) ? option.images : [])
            : [])
    ].filter((image, index, all) => image && all.indexOf(image) === index)
        .map(image => new URL(image, window.location.href).href);
    const schema = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.description || undefined,
        image: images.length ? images : undefined,
        category: product.category || undefined
    };
    const numericPriceMatch = String(product.price ?? "").trim().match(/^(?:RWF\s*)?(\d+(?:,\d{3})*)(?:\.\d{1,2})?\s*(?:RWF)?$/i);
    if (numericPriceMatch) {
        const numericPrice = Number(numericPriceMatch[1].replace(/,/g, ""));
        if (Number.isFinite(numericPrice) && numericPrice >= 0) {
            schema.offers = {
                "@type": "Offer",
                url: canonicalURL.href,
                priceCurrency: "RWF",
                price: numericPrice.toFixed(2)
            };
        }
    }

    if (!structuredData) {
        structuredData = document.createElement("script");
        structuredData.type = "application/ld+json";
        structuredData.id = "product-structured-data";
        document.head.appendChild(structuredData);
    }
    structuredData.textContent = JSON.stringify(schema, (key, value) =>
        value === undefined ? undefined : value
    ).replace(/</g, "\\u003c");
}

function setMetaDescription(description) {
    let descriptionTag = document.querySelector('meta[name="description"]');
    if (!descriptionTag) {
        descriptionTag = document.createElement("meta");
        descriptionTag.name = "description";
        document.head.appendChild(descriptionTag);
    }
    descriptionTag.content = String(description || "").replace(/\s+/g, " ").trim().slice(0, 160);
}

function setCanonicalURL(url) {
    let canonicalTag = document.querySelector('link[rel="canonical"]');
    if (!url) {
        canonicalTag?.remove();
        return;
    }
    if (!canonicalTag) {
        canonicalTag = document.createElement("link");
        canonicalTag.rel = "canonical";
        document.head.appendChild(canonicalTag);
    }
    canonicalTag.href = url;
}

function selectProductVariation(productId, variationName) {
    const product = products.find(item => item.id === productId);
    const option = getStorefrontProductOptions(product)
        .find(item => item.value === variationName);
    if (!product || !option) return;

    const optionImages = Array.isArray(option.images)
        ? option.images.filter(Boolean)
        : [];
    const mainImages = [product?.image, ...(product?.images || [])].filter(Boolean);
    const images = [...optionImages, ...mainImages]
        .filter((image, index, allImages) => image && allImages.indexOf(image) === index);
    const mainImage = document.querySelector("[data-product-main-image]");
    const thumbnails = document.getElementById("product-variation-photos");

    if (images.length) {
        if (mainImage) {
            mainImage.src = optionImages[0] || images[0];
            mainImage.alt = `${product.name} - ${option.name}`;
        } else {
            const gallery = document.querySelector(".product-detail-gallery");
            if (gallery) {
                gallery.innerHTML = `<img class="product-detail-main-image" src="${optionImages[0] || images[0]}" alt="${product.name} - ${option.name}" data-product-main-image>`;
            }
        }
    }

    if (thumbnails) {
        const optionPhotoList = option.value === "__main_image__"
            ? optionImages
            : images;
        thumbnails.innerHTML = optionPhotoList.length > 1
            ? optionPhotoList.map((image, index) => `
                <button type="button" class="product-detail-thumbnail${index === 0 ? " is-active" : ""}"
                    data-photo="${image}" aria-label="Show ${option.name} photo ${index + 1}">
                    <img src="${image}" alt="${product.name} - ${option.name} photo ${index + 1}" loading="lazy" decoding="async">
                </button>
            `).join("")
            : "";

        thumbnails.querySelectorAll(".product-detail-thumbnail").forEach(button => {
            button.addEventListener("click", () => selectProductPhoto(button));
        });
    }
}

function selectProductPhoto(button) {
    const image = document.querySelector("[data-product-main-image]");
    if (!image || !button?.dataset.photo) return;

    image.src = button.dataset.photo;
    button.parentElement.querySelectorAll(".product-detail-thumbnail").forEach(item => {
        item.classList.toggle("is-active", item === button);
    });
}


// ==========================================
// BUNDLES
// ==========================================

const defaultBundles = [
    { name: "Birthday Surprise", emoji: ["🌹", "🍫", "🎂"], price: 55000, description: "Beautifully combined gifts for a special occasion." },
    { name: "Romantic Surprise", emoji: ["🌹", "💎", "🍫"], price: 75000, description: "Beautifully combined gifts for a special occasion." },
    { name: "Luxury Gift Box", emoji: ["🌸", "🎁", "🧸"], price: 100000, description: "Beautifully combined gifts for a special occasion." }
];

function escapeBundleText(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
}

async function renderBundles() {
    const element = document.getElementById("bundles");
    if (!element) return;

    let managedBundles = [];
    let managedNames = [];
    let deletedOriginalBundles = [];
    try {
        const response = await fetch(`${API_URL}/api/products`);
        const data = await response.json();
        if (response.ok && data.success) {
            const products = data.products || [];
            deletedOriginalBundles = data.deletedOriginalBundles || [];
            managedNames = products
                .filter(product => product.category === "gift-bundles")
                .map(product => product.name);
            managedBundles = products
                .filter(product => product.category === "gift-bundles" && product.available !== false)
                .map(product => ({
                    ...product,
                    image: product.image || product.images?.[0] || "",
                    mongoId: product._id
                }));
        }
    } catch (error) {
        console.warn("Could not load gift bundles from the server:", error);
    }

    const managedNameSet = new Set(managedNames.map(name => String(name).toLowerCase()));
    const bundles = [
        ...managedBundles.map(bundle => ({ ...bundle, mongoId: bundle._id })),
        ...defaultBundles.filter(bundle =>
            !managedNameSet.has(bundle.name.toLowerCase()) &&
            !deletedOriginalBundles.includes(bundle.name)
        )
    ];

    element.innerHTML = bundles.map((bundle, index) => {
        const visual = bundle.image
            ? `<img src="${escapeBundleText(bundle.image)}" alt="${escapeBundleText(bundle.name)}" class="bundle-photo" loading="lazy" decoding="async">`
            : `<div class="bundle-art">${escapeBundleText((bundle.emoji || ["🎁"]).join(" "))}</div>`;
        return `
            <article class="bundle-card">
                ${visual}
                <div class="product-info">
                    <h2>${escapeBundleText(bundle.name)}</h2>
                    <p>${escapeBundleText(bundle.description || "Beautifully combined gifts for a special occasion.")}</p>
                    ${bundle.price !== "" && bundle.price !== null && bundle.price !== undefined ? `<strong>${money(bundle.price)}</strong>` : ""}
                    <button class="add-btn" onclick="addBundle(${index})">Add Bundle</button>
                </div>
            </article>`;
    }).join("");

    window.bundleData = bundles;
}


// ==========================================
// ADD BUNDLE TO CART
// ==========================================

function addBundle(index) {

    const bundle =
        window.bundleData[index];


    if (!bundle) {

        return;

    }


    cart.push({

        id:
            "bundle" + (bundle.mongoId || bundle.name),

        name:
            bundle.name,

        price:
            bundle.price,

        emoji:
            "🎁",

        quantity:
            1,

        mongoId:
            null

    });


    save();


    alert(
        "Bundle added to cart!"
    );

}


// ==========================================
// RENDER CART
// ==========================================


function renderCart() {
    const element = document.getElementById("cart-items");

    if (!element) return;

    if (!cart.length) {
        element.innerHTML = `
            <div class="empty-cart">
                <p>Your cart is empty.</p>
                <a href="shop.html">Start shopping →</a>
            </div>
        `;

        const summary = document.getElementById("cart-summary");
        if (summary) summary.innerHTML = "";
        return;
    }

    element.innerHTML = cart.map((item, index) => {
        const isFlower =
            (item.category || "").toLowerCase().trim() === "flowers";

        const itemImage = item.image
            ? `
                <img
                    src="${item.image}"
                    alt="${item.name}"
                    style="width:80px;height:80px;object-fit:cover;border-radius:8px;"
                >
              `
            : `
                <div style="width:80px;height:80px;display:flex;align-items:center;justify-content:center;font-size:32px;">
                    ${item.emoji || "🎁"}
                </div>
              `;

        // Flowers have no fixed price in the cart.
        // Custom gifts and all other products keep their existing pricing.
        const itemTotal = isFlower
            ? null
            : Number(item.price) * item.quantity;

        const componentDetails =
            item.isCustomGift && item.components
                ? `
                    <div style="margin-top:8px;font-size:13px;color:#666;">
                        ${
                            item.components.map(component => `
                                <div>
                                    • ${component.name} — ${money(component.price)}
                                </div>
                            `).join("")
                        }
                    </div>
                  `
                : "";

        return `
            <div class="cart-row">
                <div>${itemImage}</div>

                <div>
                    <strong>${item.name}</strong>
                    ${item.variationName ? `<p class="cart-variation">${item.variationType || "Option"}: ${item.variationName}</p>` : ""}
                    ${componentDetails}

                    <p>
                        ${isFlower ? "Price to be discussed" : `${money(item.price)} each`}
                    </p>
                </div>

                <div>
                    <button onclick="changeQty(${index}, -1)">−</button>
                    ${item.quantity}
                    <button onclick="changeQty(${index}, 1)">+</button>
                </div>

                <strong>
                    ${isFlower ? "To be discussed" : money(itemTotal)}
                </strong>

                <button onclick="removeItem(${index})">
                    Remove
                </button>
            </div>
        `;
    }).join("");

    // Exclude flowers from the calculated cart total.
    // Other products and custom gifts retain their existing totals.
    const total = cart.reduce((sum, item) => {
        const isFlower =
            (item.category || "").toLowerCase().trim() === "flowers";

        if (isFlower) return sum;

        return sum + Number(item.price) * item.quantity;
    }, 0);

    const hasFlowers = cart.some(item =>
        (item.category || "").toLowerCase().trim() === "flowers"
    );

    const summary = document.getElementById("cart-summary");

    if (summary) {
        summary.innerHTML = `
            <div class="cart-total">
                <h2>Total: ${money(total)}</h2>

                ${
                    hasFlowers
                        ? `<p>Flower prices will be discussed and confirmed through WhatsApp.</p>`
                        : ""
                }

                <p>
                    Review your order before sending it to us on WhatsApp.
                </p>

                <button class="btn primary" onclick="orderViaWhatsApp()">
                    Order via WhatsApp 📱
                </button>
            </div>
        `;
    }
}



// ==========================================
// ORDER VIA WHATSAPP
// ==========================================


function orderViaWhatsApp() {
    if (!cart.length) {
        alert("Your cart is empty.");
        return;
    }

    let message = "Hello Flowers & Gifts Rwanda! 🌸\n\n";
    message += "I would like to place an order:\n\n";

    cart.forEach((item, index) => {
        const isFlower =
            (item.category || "").toLowerCase().trim() === "flowers";

        const itemTotal = isFlower
            ? null
            : Number(item.price) * item.quantity;

        message += `${index + 1}. ${item.name}\n`;
        if (item.variationName) {
            message += `   ${item.variationType || "Option"}: ${item.variationName}\n`;
        }
        message += `   Quantity: ${item.quantity}\n`;

        if (isFlower) {
            message += "   Price: To be discussed\n";
            message += "   Subtotal: To be discussed\n";
        } else {
            message += `   Price: ${money(item.price)} each\n`;
            message += `   Subtotal: ${money(itemTotal)}\n`;
        }

        // CUSTOM GIFT CONTENTS
        if (item.isCustomGift && item.components) {
            message += "   Gift contents:\n";

            item.components.forEach(component => {
                message += `   - ${component.name}: ${money(component.price)}\n`;

                if (component.image) {
                    message += `     Product image: ${component.image}\n`;
                }
            });
        } else if (item.image) {
            message += `   Product image: ${item.image}\n`;
        }

        message += "\n";
    });

    // Exclude flowers from the calculated total.
    const total = cart.reduce((sum, item) => {
        const isFlower =
            (item.category || "").toLowerCase().trim() === "flowers";

        if (isFlower) return sum;

        return sum + Number(item.price) * item.quantity;
    }, 0);

    const hasFlowers = cart.some(item =>
        (item.category || "").toLowerCase().trim() === "flowers"
    );

    message += `Total for priced items: ${money(total)}\n`;

    if (hasFlowers) {
        message += "Flower prices are not included in this total and will be agreed upon through WhatsApp.\n";
    }

    message += "\nPlease let me know the delivery details and how I can complete the payment.\n\n";
    message += "Thank you! 🌹";

    const whatsappURL =
        `https://wa.me/${WHATSAPP_NUMBER}?text=` +
        encodeURIComponent(message);

    window.open(whatsappURL, "_blank");
}

// ==========================================
// CHANGE CART QUANTITY
// ==========================================

function changeQty(
    index,
    difference
) {

    if (!cart[index]) {

        return;

    }


    cart[index].quantity +=
        difference;


    if (
        cart[index].quantity <= 0
    ) {

        cart.splice(
            index,
            1
        );

    }


    save();


    renderCart();

}


// ==========================================
// REMOVE CART ITEM
// ==========================================

function removeItem(index) {

    if (!cart[index]) {

        return;

    }


    cart.splice(
        index,
        1
    );


    save();


    renderCart();

}


// ==========================================
// OLD PLACE ORDER FUNCTION
// ==========================================

function placeOrder(event) {

    event.preventDefault();


    localStorage.removeItem(
        "cart"
    );


    location.href =
        "confirmation.html";

}


// ==========================================
// BUILD A GIFT
// ==========================================

function getBuilderPriceAmount(product) {
    if (!product || String(product.price ?? "").trim() === "") return null;
    const amount = Number(
        String(product.price).replace(/,/g, "").replace(/\s*RWF$/i, "").trim()
    );
    return Number.isFinite(amount) ? amount : null;
}

function updateBuilder() {
    const flowerElement = document.getElementById("flower");
    const giftElement = document.getElementById("sweet");
    if (!flowerElement || !giftElement) return;

    const availableProducts = products.filter(product => product.available !== false);
    const flowers = availableProducts.filter(product =>
        (product.category || "").toLowerCase().trim() === "flowers"
    );
    const giftCategories = [
        "chocolates", "perfumes", "fashion", "cakes", "teddy-bears",
        "baskets", "jewelry", "gift-sets", "other", "shoes-and-bags",
        "champagne-and-wines", "gift-bundles"
    ];
    const gifts = availableProducts.filter(product =>
        giftCategories.includes((product.category || "").toLowerCase().trim()) &&
        (product.category || "").toLowerCase().trim() !== "gift-bundles"
    );

    const previousFlower = flowerElement.value;
    const previousGifts = Array.from(giftElement.selectedOptions, option => option.value);
    const safeText = value => String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
    const photoFor = product => product.image || product.images?.[0] || "";
    const imageMarkup = (product, className) => {
        const image = photoFor(product);
        return image
            ? `<img class="${className}" src="${safeText(image)}" alt="${safeText(product.name)}" loading="lazy">`
            : `<span class="${className} builder-choice-emoji">${safeText(product.emoji || "🎁")}</span>`;
    };

    flowerElement.innerHTML = `<option value="">Choose flowers</option>${flowers.map(product =>
        `<option value="${safeText(product.id)}">${safeText(product.name)}</option>`
    ).join("")}`;
    giftElement.innerHTML = gifts.map(product =>
        `<option value="${safeText(product.id)}">${safeText(product.name)}</option>`
    ).join("");

    if (flowers.some(product => String(product.id) === previousFlower)) flowerElement.value = previousFlower;
    Array.from(giftElement.options).forEach(option => {
        option.selected = previousGifts.includes(option.value);
    });

    function renderChoices(containerId, items, select) {
        const container = document.getElementById(containerId);
        if (!container) return;
        if (!items.length) {
            container.innerHTML = `<p class="builder-empty-options">No ${containerId.includes("flower") ? "flowers" : "gifts"} are available right now.</p>`;
            return;
        }
        container.innerHTML = items.map(product => {
            const id = String(product.id);
            const selected = select.value === id;
            const name = product.name;
            const price = formatGalleryPrice(product.price);
            const visual = imageMarkup(product, "builder-choice-image");
            return `<button type="button" class="builder-choice-card${selected ? " selected" : ""}"
                data-builder-choice="${safeText(id)}" aria-pressed="${selected}">
                ${visual}<span class="builder-choice-name">${safeText(name)}</span>
                <span class="builder-choice-price">${safeText(price || "Price on request")}</span>
            </button>`;
        }).join("");
        container.querySelectorAll("[data-builder-choice]").forEach(button => {
            button.addEventListener("click", () => {
                select.value = button.dataset.builderChoice;
                updatePreview();
            });
        });
    }

    function renderGiftChoices(selectedGifts) {
        const container = document.getElementById("builder-gift-options");
        if (!container) return;
        if (!gifts.length) {
            container.innerHTML = '<p class="builder-empty-options">No gifts are available right now.</p>';
            return;
        }
        container.innerHTML = gifts.map(product => {
            const id = String(product.id);
            const selected = selectedGifts.some(item => String(item.id) === id);
            const price = formatGalleryPrice(product.price) || "Price on request";
            return `<button type="button" class="builder-choice-card builder-gift-choice${selected ? " selected" : ""}"
                data-builder-gift="${safeText(id)}" aria-pressed="${selected}">
                ${imageMarkup(product, "builder-choice-image")}
                <span class="builder-choice-name">${safeText(product.name)}</span>
                <span class="builder-choice-price">${safeText(price)}</span>
                <span class="builder-gift-action">${selected ? "✓ Added · Remove" : "+ Add gift"}</span>
            </button>`;
        }).join("");
        container.querySelectorAll("[data-builder-gift]").forEach(button => {
            button.addEventListener("click", () => {
                const option = Array.from(giftElement.options).find(item => item.value === button.dataset.builderGift);
                if (option) option.selected = !option.selected;
                updatePreview();
            });
        });
    }

    function updatePreview() {
        const flower = flowers.find(product => String(product.id) === flowerElement.value);
        const selectedGiftIds = Array.from(giftElement.selectedOptions, option => option.value);
        const selectedGifts = gifts.filter(product => selectedGiftIds.includes(String(product.id)));
        const selectedProducts = [flower, ...selectedGifts].filter(Boolean);
        const priceOnRequest = selectedProducts.some(product => getBuilderPriceAmount(product) === null);
        const total = selectedProducts.reduce((sum, product) => sum + (getBuilderPriceAmount(product) ?? 0), 0);
        const totalElement = document.getElementById("builder-total");
        if (totalElement) {
            totalElement.textContent = priceOnRequest ? "Price on request" : money(total);
        }

        const empty = document.getElementById("builder-preview-empty");
        const previewItems = document.getElementById("builder-preview-items");
        if (empty) empty.hidden = Boolean(flower || selectedGifts.length);
        if (previewItems) {
            previewItems.innerHTML = selectedProducts.map(product => {
                const isFlower = flower && String(product.id) === String(flower.id);
                return `<article class="builder-preview-piece">
                    ${imageMarkup(product, "builder-preview-image")}
                    <span class="builder-selected-name">${safeText(product.name)}</span>
                    <button type="button" class="builder-selected-remove"
                        data-remove-builder-item="${safeText(product.id)}"
                        data-builder-item-type="${isFlower ? "flower" : "gift"}"
                        aria-label="Remove ${safeText(product.name)} from your gift">×</button>
                </article>`;
            }).join("");
            previewItems.querySelectorAll("[data-remove-builder-item]").forEach(button => {
                button.addEventListener("click", () => {
                    if (button.dataset.builderItemType === "flower") {
                        flowerElement.value = "";
                    } else {
                        const option = Array.from(giftElement.options).find(item => item.value === button.dataset.removeBuilderItem);
                        if (option) option.selected = false;
                    }
                    updatePreview();
                });
            });
        }
        renderChoices("builder-flower-options", flowers, flowerElement);
        renderGiftChoices(selectedGifts);
    }

    flowerElement.onchange = updatePreview;
    giftElement.onchange = updatePreview;
    updatePreview();
}


// ==========================================
// ADD CUSTOM GIFT
// ==========================================

function addCustomGift() {

    const flowerElement =
        document.getElementById(
            "flower"
        );


    const giftElement =
        document.getElementById(
            "sweet"
        );


    if (
        !flowerElement ||
        !giftElement
    ) {

        return;

    }


    // ==========================================
    // FIND SELECTED FLOWER
    // ==========================================

    const flower =
        products.find(
            product =>
                String(product.id) ===
                flowerElement.value
        );


    // ==========================================
    // FIND ALL SELECTED GIFTS
    // ==========================================

    const gifts = Array.from(giftElement.selectedOptions)
        .map(option => products.find(product => String(product.id) === option.value))
        .filter(Boolean);


    // ==========================================
    // FLOWER REQUIRED
    // ==========================================

    if (!flower) {

        alert(
            "Please choose flowers first."
        );

        return;

    }


    // ==========================================
    // CHECK AVAILABILITY
    // ==========================================

    const selectedProducts = [flower, ...gifts];


    const unavailableProduct =
        selectedProducts.find(
            product =>
                product.available === false
        );


    if (unavailableProduct) {

        alert(
            `${unavailableProduct.name} is currently unavailable. Please choose another product.`
        );


        updateBuilder();


        return;

    }


    // ==========================================
    // CALCULATE TOTAL
    // ==========================================

    const total =
        selectedProducts.reduce(
            (sum, product) => sum + (getBuilderPriceAmount(product) ?? 0),

            0
        );


    // ==========================================
    // CREATE CUSTOM GIFT
    // ==========================================

    const customGift = {

        id:
            "custom" +
            Date.now(),

        name:
            gifts.length
                ? [flower.name, ...gifts.map(gift => gift.name)].join(" + ")
                : flower.name,

        price:
            total,

        image:
            flower.image || flower.images?.[0] || "",

        emoji:
            "🎁",

        quantity:
            1,

        mongoId:
            null,

        isCustomGift:
            true,

        components:
            selectedProducts.map(
                product => ({

                    name:
                        product.name,

                    price:
                        getBuilderPriceAmount(product) ?? 0,

                    image:
                        product.image || product.images?.[0] || "",

                    category:
                        product.category

                })
            )

    };


    cart.push(
        customGift
    );


    save();


    alert(
        "Your gift has been added to your cart!"
    );


    // Open cart.
    window.location.href =
        "cart.html";

}


// ==========================================
// INITIALIZE APPLICATION
// ==========================================

async function initializeApp() {

    // ==========================================
    // LOAD PRODUCTS FROM MONGODB
    // ==========================================

    await loadMongoProducts();


    // ==========================================
    // UPDATE CART COUNT
    // ==========================================

    updateCount();


    // ==========================================
    // FEATURED / POPULAR PRODUCTS
    // ==========================================

    renderFeatured();


    // ==========================================
    // HOMEPAGE FLOWERS
    // ==========================================

    renderHomepageFlowers();


    // ==========================================
    // SHOP PAGE
    // ==========================================

    renderShop();


    // ==========================================
    // PRODUCT DETAILS
    // ==========================================

    renderProduct();


    // ==========================================
    // BUNDLES
    // ==========================================

    renderBundles();


    // ==========================================
    // CART
    // ==========================================

    renderCart();


    // ==========================================
    // BUILD A GIFT
    // ==========================================

    updateBuilder();


    // ==========================================
    // FEATURED FLOWERS & GIFTS GALLERIES
    // IMPORTANT:
    // THIS MUST RUN AFTER PRODUCTS ARE LOADED
    // ==========================================

    initializeFeaturedGalleries();

}


// ==========================================
// START APPLICATION
// ==========================================

initializeApp();
