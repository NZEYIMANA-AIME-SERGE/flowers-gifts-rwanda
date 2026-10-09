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

const API_URL = "http://localhost:5000";


// ==========================================
// WHATSAPP ORDER NUMBER
// ==========================================

const WHATSAPP_NUMBER = "250791912189";


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
                                product.image || "",

                            emoji:
                                product.image
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


// ==========================================
// ADD PRODUCT TO CART
// ==========================================

function addToCart(id) {

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


    // ==========================================
    // CHECK IF PRODUCT IS ALREADY IN CART
    // ==========================================

    const existingItem =
        cart.find(
            item => item.id === id
        );


    if (existingItem) {

        existingItem.quantity++;

    } else {

        cart.push({

            ...product,

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

    const productVisual =
        product.image

            ? `
                <img
                    src="${product.image}"
                    alt="${product.name}"
                >
              `

            : `
                <div class="product-placeholder">
                    ${product.emoji || "🎁"}
                </div>
              `;


    return `

        <article class="product-card">

            <div class="product-image">

                ${productVisual}

            </div>


            <div class="product-info">

                <h3>
                    ${product.name}
                </h3>


                <p>
                    ${product.description}
                </p>


                <strong>
                    ${money(product.price)}
                </strong>


                <button
                    class="add-btn"
                    onclick="addToCart(${product.id})"
                >
                    Add to Cart
                </button>


                <a
                    class="details"
                    href="product.html?id=${product.id}"
                >
                    View details →
                </a>

            </div>

        </article>

    `;

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

    if (occasion !== "all") {

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
        filteredFlowers
            .map(card)
            .join("");

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


    const flowers =
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

    return Number(price || 0).toLocaleString(
        "en-RW"
    ) + " RWF";

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
            price.textContent =
                formatGalleryPrice(
                    product.price
                );
        }


        if (category) {
            category.textContent =
                product.category || "Flowers";
        }


        if (button) {

            button.onclick = function () {

                if (product.mongoId) {

                    window.location.href =
                        `product.html?id=${product.mongoId}`;

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
                formatGalleryPrice(
                    product.price
                );
        }


        if (category) {
            category.textContent =
                product.category || "Gift";
        }


        if (button) {

            button.onclick = function () {

                if (product.mongoId) {

                    window.location.href =
                        `product.html?id=${product.mongoId}`;

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


    // ==========================================
    // GET CATEGORY FROM URL
    // ==========================================

    const params =
        new URLSearchParams(
            window.location.search
        );


    const urlCategory =
        params.get("category") || "";


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


                    return (
                        productCategory ===
                        category
                            .toLowerCase()
                            .trim()
                    );

                }
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

        perfumes: "Perfumes",

        fashion: "Fashion",

        cakes: "Cakes",

        "teddy-bears": "Teddy Bears",

        baskets: "Gift Baskets",

        jewelry: "Jewelry",

        "gift-sets": "Gift Sets",

        other: "Other"

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


    // ==========================================
    // KEEP SELECTOR IN SYNC WITH URL
    // ==========================================

    if (
        categoryElement &&
        category
    ) {

        categoryElement.value =
            category;

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


// ==========================================
// PRODUCT DETAILS PAGE
// ==========================================

function renderProduct() {

    const params =
        new URLSearchParams(
            location.search
        );


    const id =
        Number(
            params.get("id")
        );


    const product =
        products.find(
            product =>
                product.id === id
        ) ||
        products[0];


    const element =
        document.getElementById(
            "product-detail"
        );


    if (
        !element ||
        !product
    ) {

        return;

    }


    const productVisual =
        product.image

            ? `
                <img
                    src="${product.image}"
                    alt="${product.name}"
                    style="
                        width:100%;
                        height:100%;
                        object-fit:cover;
                    "
                >
              `

            : product.emoji || "🎁";


    element.innerHTML = `

        <div class="product-detail">

            <div class="detail-art">

                ${productVisual}

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


                <h2>

                    ${money(product.price)}

                </h2>


                <p>

                    ${
                        product.available !== false

                            ? "Available"

                            : "Currently unavailable"

                    }

                </p>


                <button
                    class="btn primary"
                    onclick="addToCart(${product.id})"

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

}


// ==========================================
// BUNDLES
// ==========================================

function renderBundles() {

    const bundles = [

        [
            "Birthday Surprise",
            ["🌹", "🍫", "🎂"],
            55000
        ],

        [
            "Romantic Surprise",
            ["🌹", "💎", "🍫"],
            75000
        ],

        [
            "Luxury Gift Box",
            ["🌸", "🎁", "🧸"],
            100000
        ]

    ];


    const element =
        document.getElementById(
            "bundles"
        );


    if (!element) {

        return;

    }


    element.innerHTML =
        bundles
            .map(
                (bundle, index) => `

                    <article class="bundle-card">

                        <div class="bundle-art">

                            ${bundle[1].join(" ")}

                        </div>


                        <div class="product-info">

                            <h2>

                                ${bundle[0]}

                            </h2>


                            <p>

                                Beautifully combined gifts
                                for a special occasion.

                            </p>


                            <strong>

                                ${money(bundle[2])}

                            </strong>


                            <button
                                class="add-btn"
                                onclick="addBundle(${index})"
                            >

                                Add Bundle

                            </button>

                        </div>

                    </article>

                `
            )
            .join("");


    window.bundleData =
        bundles;

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
            "bundle" + index,

        name:
            bundle[0],

        price:
            bundle[2],

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

    const element =
        document.getElementById(
            "cart-items"
        );


    if (!element) {

        return;

    }


    if (!cart.length) {

        element.innerHTML = `

            <div class="empty-cart">

                <p>
                    Your cart is empty.
                </p>


                <a href="shop.html">
                    Start shopping →
                </a>

            </div>

        `;


        const summary =
            document.getElementById(
                "cart-summary"
            );


        if (summary) {

            summary.innerHTML = "";

        }


        return;

    }


    element.innerHTML =
        cart
            .map(
                (item, index) => {

                    const itemImage =
                        item.image

                            ? `
                                <img
                                    src="${item.image}"
                                    alt="${item.name}"
                                    style="
                                        width:80px;
                                        height:80px;
                                        object-fit:cover;
                                        border-radius:8px;
                                    "
                                >
                              `

                            : `
                                <div
                                    style="
                                        width:80px;
                                        height:80px;
                                        display:flex;
                                        align-items:center;
                                        justify-content:center;
                                        font-size:32px;
                                    "
                                >
                                    ${item.emoji || "🎁"}
                                </div>
                              `;


                    const itemTotal =
                        Number(item.price) *
                        item.quantity;


                    // ==========================================
                    // CUSTOM GIFT COMPONENTS
                    // ==========================================

                    const componentDetails =
                        item.isCustomGift &&
                        item.components

                            ? `

                                <div
                                    style="
                                        margin-top:8px;
                                        font-size:13px;
                                        color:#666;
                                    "
                                >

                                    ${
                                        item.components
                                            .map(
                                                component => `

                                                    <div>

                                                        • ${
                                                            component.name
                                                        }
                                                        —
                                                        ${
                                                            money(
                                                                component.price
                                                            )
                                                        }

                                                    </div>

                                                `
                                            )
                                            .join("")
                                    }

                                </div>

                              `

                            : "";


                    return `

                        <div class="cart-row">

                            <div>
                                ${itemImage}
                            </div>


                            <div>

                                <strong>
                                    ${item.name}
                                </strong>

                                ${componentDetails}

                                <p>
                                    ${money(item.price)} each
                                </p>

                            </div>


                            <div>

                                <button
                                    onclick="changeQty(${index}, -1)"
                                >
                                    −
                                </button>

                                ${item.quantity}

                                <button
                                    onclick="changeQty(${index}, 1)"
                                >
                                    +
                                </button>

                            </div>


                            <strong>
                                ${money(itemTotal)}
                            </strong>


                            <button
                                onclick="removeItem(${index})"
                            >
                                Remove
                            </button>

                        </div>

                    `;

                }
            )
            .join("");


    // ==========================================
    // CART TOTAL
    // ==========================================

    const total =
        cart.reduce(
            (sum, item) =>
                sum +
                Number(item.price) *
                item.quantity,

            0
        );


    const summary =
        document.getElementById(
            "cart-summary"
        );


    if (summary) {

        summary.innerHTML = `

            <div class="cart-total">

                <h2>
                    Total: ${money(total)}
                </h2>


                <p>
                    Review your order before sending
                    it to us on WhatsApp.
                </p>


                <button
                    class="btn primary"
                    onclick="orderViaWhatsApp()"
                >
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

        alert(
            "Your cart is empty."
        );

        return;

    }


    let message =
        "Hello Flowers & Gifts Rwanda! 🌸\n\n";


    message +=
        "I would like to place an order:\n\n";


    cart.forEach(
        (item, index) => {

            const itemTotal =
                Number(item.price) *
                item.quantity;


            message +=
                `${index + 1}. ${item.name}\n`;


            message +=
                `   Quantity: ${item.quantity}\n`;


            message +=
                `   Price: ${money(item.price)} each\n`;


            // ==========================================
            // CUSTOM GIFT CONTENTS
            // ==========================================

            if (
                item.isCustomGift &&
                item.components
            ) {

                message +=
                    "   Gift contents:\n";


                item.components.forEach(
                    component => {

                        message +=
                            `   - ${component.name}: ${money(component.price)}\n`;


                        if (component.image) {

                            message +=
                                `     Product image: ${component.image}\n`;

                        }

                    }
                );

            } else if (item.image) {

                message +=
                    `   Product image: ${item.image}\n`;

            }


            message +=
                `   Subtotal: ${money(itemTotal)}\n\n`;

        }
    );


    const total =
        cart.reduce(
            (sum, item) =>
                sum +
                Number(item.price) *
                item.quantity,

            0
        );


    message +=
        `Total: ${money(total)}\n\n`;


    message +=
        "Please let me know the delivery details and how I can complete the payment.\n\n";


    message +=
        "Thank you! 🌹";


    const whatsappURL =
        `https://wa.me/${WHATSAPP_NUMBER}?text=` +
        encodeURIComponent(message);


    window.open(
        whatsappURL,
        "_blank"
    );

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

function updateBuilder() {

    const flowerElement =
        document.getElementById(
            "flower"
        );


    const giftElement =
        document.getElementById(
            "sweet"
        );


    const totalElement =
        document.getElementById(
            "builder-total"
        );


    // Stop if this is not the Build a Gift page.
    if (
        !flowerElement ||
        !giftElement
    ) {

        return;

    }


    // ==========================================
    // ONLY AVAILABLE PRODUCTS
    // ==========================================

    const availableProducts =
        products.filter(
            product =>
                product.available !== false
        );


    // ==========================================
    // FIND AVAILABLE FLOWERS
    // ==========================================

    const flowers =
        availableProducts.filter(
            product =>
                (product.category || "")
                    .toLowerCase()
                    .trim() === "flowers"
        );


    // ==========================================
    // GIFT CATEGORIES
    // ==========================================

    const giftCategories = [

        "chocolates",

        "perfumes",

        "fashion",

        "cakes",

        "teddy-bears",

        "baskets",

        "jewelry",

        "gift-sets",

        "other"

    ];


    // ==========================================
    // FIND INDIVIDUAL GIFTS
    // ==========================================

    const gifts =
        availableProducts.filter(
            product =>
                giftCategories.includes(
                    (product.category || "")
                        .toLowerCase()
                        .trim()
                )
        );


    // ==========================================
    // FLOWER DROPDOWN
    // ==========================================

    flowerElement.innerHTML = `

        <option value="">
            Choose flowers
        </option>

        ${
            flowers
                .map(
                    product => `

                        <option
                            value="${product.id}"
                        >
                            ${product.name}
                            —
                            ${money(product.price)}
                        </option>

                    `
                )
                .join("")
        }

    `;


    // ==========================================
    // GIFT DROPDOWN
    // ==========================================

    giftElement.innerHTML = `

        <option value="">
            No additional gift
        </option>

        ${
            gifts
                .map(
                    product => `

                        <option
                            value="${product.id}"
                        >
                            ${product.name}
                            —
                            ${money(product.price)}
                        </option>

                    `
                )
                .join("")
        }

    `;


    // ==========================================
    // CALCULATE TOTAL
    // ==========================================

    function calculateTotal() {

        const flower =
            flowers.find(
                product =>
                    String(product.id) ===
                    flowerElement.value
            );


        const gift =
            gifts.find(
                product =>
                    String(product.id) ===
                    giftElement.value
            );


        const total =
            (flower
                ? Number(flower.price)
                : 0
            ) +

            (gift
                ? Number(gift.price)
                : 0
            );


        if (totalElement) {

            totalElement.textContent =
                money(total);

        }

    }


    flowerElement.onchange =
        calculateTotal;


    giftElement.onchange =
        calculateTotal;


    calculateTotal();

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
    // FIND SELECTED GIFT
    // ==========================================

    const gift =
        products.find(
            product =>
                String(product.id) ===
                giftElement.value
        );


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

    const selectedProducts =
        gift
            ? [flower, gift]
            : [flower];


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
            (sum, product) =>
                sum +
                Number(product.price),

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
            gift
                ? `${flower.name} + ${gift.name}`
                : flower.name,

        price:
            total,

        image:
            flower.image || "",

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
                        Number(product.price),

                    image:
                        product.image || "",

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