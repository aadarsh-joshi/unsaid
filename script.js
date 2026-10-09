const SUPABASE_URL = "https://wybcenprxtonxnyxiayv.supabase.co";
const SUPABASE_KEY = "sb_publishable_N9g_jvGcrPklD30eguT0Hw_vR0ZuvEM";

const postsContainer = document.getElementById("posts");
const thoughtBox = document.getElementById("thought");
const confirmation = document.getElementById("confirmation");


// SAMPLE POSTS

const samplePosts = [
    {
        text: "I laughed when everyone made the joke, but I kept thinking about it after I got home.",
        date: "sample-1"
    },

    {
        text: "Sometimes I know exactly what I want to say. I just don't know how to say it without making everything awkward.",
        date: "sample-2"
    },

    {
        text: "I always tell people I'm fine because explaining why I'm not feels harder than just saying I'm fine.",
        date: "sample-3"
    },

    {
        text: "I thought staying quiet meant I was avoiding problems. Maybe sometimes I was just avoiding the conversation.",
        date: "sample-4"
    }
];


// WRITE BUTTON

function showWrite() {
    document.getElementById("write").scrollIntoView({
        behavior: "smooth"
    });
}


// READ BUTTON

function showRead() {
    document.getElementById("read").scrollIntoView({
        behavior: "smooth"
    });
}


// GET UNDERSTANDING COUNT

async function getUnderstandingCount(postId) {

    try {

        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/Understandings?post_id=eq.${postId}&select=id`,
            {
                method: "GET",

                headers: {
                    "apikey": SUPABASE_KEY,
                    "Authorization": `Bearer ${SUPABASE_KEY}`
                }
            }
        );

        if (!response.ok) {
            return 0;
        }

        const data = await response.json();

        return data.length;

    } catch (error) {

        console.error(
            "Could not load understanding count:",
            error
        );

        return 0;
    }
}


// DISPLAY A POST


async function displayPost(post) {
    const article = document.createElement("article");
    article.className = "post";

    article.innerHTML = `
        <p></p>
        <span>— anonymous</span>
        <button class="understand-button">
            ♡ I understand this
        </button>
        <div class="understanding-count">
            0 people understand this
        </div>
    `;

    // Safely display the post's text
    article.querySelector("p").textContent =
        `"${post.content || post.text || ""}"`;

    postsContainer.appendChild(article);

    const button = article.querySelector(".understand-button");
    const countText = article.querySelector(".understanding-count");

    // SAMPLE POSTS: count is saved only in this browser
    if (!post.id) {
        const key = `sample-understood-${(post.content || post.text || "").trim()}`;
        const countKey = `sample-count-${(post.content || post.text || "").trim()}`;

        let count = Number(localStorage.getItem(countKey) || 0);

        function updateSampleCount() {
            countText.textContent =
                count === 1
                    ? "1 person understands this"
                    : `${count} people understand this`;
        }

        updateSampleCount();

        if (localStorage.getItem(key)) {
            button.textContent = "✓ You understand this";
            button.classList.add("understood");
        }

        button.addEventListener("click", function () {
            if (localStorage.getItem(key)) return;

            count += 1;
            localStorage.setItem(countKey, String(count));
            localStorage.setItem(key, "true");

            button.textContent = "✓ You understand this";
            button.classList.add("understood");
            updateSampleCount();
        });

        return;
    }

    // REAL POSTS: load shared count from Supabase
    const count = await getUnderstandingCount(post.id);

    countText.textContent =
        count === 1
            ? "1 person understands this"
            : `${count} people understand this`;

    const key = `understood-${post.id}`;

    if (localStorage.getItem(key)) {
        button.textContent = "✓ You understand this";
        button.classList.add("understood");
    }

    button.addEventListener("click", async function () {
        if (localStorage.getItem(key)) return;

        button.disabled = true;
        button.textContent = "Saving...";

        try {
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/Understandings`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "apikey": SUPABASE_KEY,
                        "Authorization": `Bearer ${SUPABASE_KEY}`,
                        "Prefer": "return=minimal"
                    },
                    body: JSON.stringify({
                        post_id: post.id
                    })
                }
            );

            if (!response.ok) {
                console.error(
                    "Could not save understanding:",
                    await response.text()
                );

                button.disabled = false;
                button.textContent = "♡ I understand this";
                return;
            }

            localStorage.setItem(key, "true");

            button.textContent = "✓ You understand this";
            button.classList.add("understood");

            const newCount = await getUnderstandingCount(post.id);

            countText.textContent =
                newCount === 1
                    ? "1 person understands this"
                    : `${newCount} people understand this`;

        } catch (error) {
            console.error("Connection error:", error);
            button.disabled = false;
            button.textContent = "♡ I understand this";
        }
    });
}


// LOAD ONLINE POSTS

async function loadPosts() {

    postsContainer.innerHTML = "";


    try {

        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/posts?select=*&order=created_at.desc`,
            {
                method: "GET",

                headers: {
                    "apikey": SUPABASE_KEY,
                    "Authorization": `Bearer ${SUPABASE_KEY}`
                }
            }
        );


        if (!response.ok) {

            console.error(
                "Could not load posts:",
                await response.text()
            );

            return;
        }


        const onlinePosts =
            await response.json();


        onlinePosts.forEach(function(post) {
            displayPost(post);
        });


    } catch (error) {

        console.error(
            "Connection error:",
            error
        );
    }
}


// SHARE ANONYMOUSLY

async function publishThought() {

    const text =
        thoughtBox.value.trim();


    if (text === "") {

        confirmation.textContent =
            "Write something first.";

        return;
    }


    confirmation.textContent =
        "Leaving your words here...";


    try {

        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/posts`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "apikey": SUPABASE_KEY,
                    "Authorization": `Bearer ${SUPABASE_KEY}`,
                    "Prefer": "return=representation"
                },

                body: JSON.stringify({
                    content: text
                })
            }
        );


        if (!response.ok) {

            console.error(
                "Could not publish post:",
                await response.text()
            );

            confirmation.textContent =
                "Something went wrong. Please try again.";

            return;
        }


        const newPost =
            await response.json();


        displayPost(newPost[0]);


        thoughtBox.value = "";


        confirmation.textContent =
            "Your words have been left here anonymously.";


        setTimeout(function() {

            confirmation.textContent = "";

        }, 3000);


    } catch (error) {

        console.error(
            "Connection error:",
            error
        );

        confirmation.textContent =
            "Could not connect to Unsaid.";
    }
}


// START WEBSITE

loadPosts();