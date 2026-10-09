const SUPABASE_URL = "https://wybcenprxtonxnyxiayv.supabase.co";
const SUPABASE_KEY = "sb_publishable_N9g_jvGcrPklD30eguT0Hw_vR0ZuvEM

// SUPABASE INITIALIZATION

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const postsContainer = document.getElementById("posts");
const thoughtBox = document.getElementById("thought");
const confirmation = document.getElementById("confirmation");
const publishButton = document.querySelector("#write button");

let isPublishing = false;
let currentSession = null;


// ANONYMOUS SIGN-IN

async function ensureAnonymousSession() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        throw error;
    }

    if (data.session) {
        currentSession = data.session;
        return currentSession;
    }

    const { data: signInData, error: signInError } =
        await supabaseClient.auth.signInAnonymously();

    if (signInError) {
        throw signInError;
    }

    if (!signInData.session) {
        throw new Error("No anonymous session was created.");
    }

    currentSession = signInData.session;
    return currentSession;
}


// KEEP SESSION UPDATED

supabaseClient.auth.onAuthStateChange(function (_event, session) {
    currentSession = session;
});


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
            `${SUPABASE_URL}/rest/v1/Understandings?post_id=eq.${encodeURIComponent(postId)}&select=id`,
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
        console.error("Could not load understanding count:", error);
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
        <button class="understand-button" type="button">
            ♡ I understand this
        </button>
        <div class="understanding-count">
            0 people understand this
        </div>
    `;

    // Always display submitted text as text, never as HTML.
    article.querySelector("p").textContent =
        `"${post.content || post.text || ""}"`;

    postsContainer.appendChild(article);

    const button = article.querySelector(".understand-button");
    const countText = article.querySelector(".understanding-count");

    // SAMPLE POSTS: retained for compatibility if used later.
    if (!post.id) {
        const postText = (post.content || post.text || "").trim();
        const key = `sample-understood-${postText}`;
        const countKey = `sample-count-${postText}`;

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

    // REAL POSTS: load the shared count from Supabase.
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
        if (localStorage.getItem(key) || button.disabled) return;

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

                button.textContent = "♡ I understand this";
                button.disabled = false;
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
            button.textContent = "♡ I understand this";
            button.disabled = false;
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

        const onlinePosts = await response.json();

        for (const post of onlinePosts) {
            await displayPost(post);
        }

    } catch (error) {
        console.error("Connection error:", error);
    }
}


// SHARE ANONYMOUSLY

async function publishThought() {
    if (isPublishing) return;

    const text = thoughtBox.value.trim();

    if (text === "") {
        confirmation.textContent = "Write something first.";
        thoughtBox.focus();
        return;
    }

    if (text.length > 1000) {
        confirmation.textContent =
            "Your thought is too long. Please keep it under 1,000 characters.";
        return;
    }

    isPublishing = true;
    publishButton.disabled = true;
    confirmation.textContent = "Preparing your anonymous space...";

    try {
        // Sign in before publishing.
        const session = await ensureAnonymousSession();

        confirmation.textContent = "Leaving your words here...";

        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/posts`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": SUPABASE_KEY,
                    "Authorization": `Bearer ${session.access_token}`,
                    "Prefer": "return=representation"
                },
                body: JSON.stringify({
                    content: text,
                    user_id: session.user.id
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

        const newPost = await response.json();

        if (!Array.isArray(newPost) || !newPost[0]) {
            confirmation.textContent =
                "We couldn't confirm your post. Please refresh and check before trying again.";
            return;
        }

        await displayPost(newPost[0]);

        thoughtBox.value = "";

        confirmation.textContent =
            "Your words have been left here anonymously.";

        setTimeout(function () {
            confirmation.textContent = "";
        }, 3000);

    } catch (error) {
        console.error("Could not sign in or publish:", error);

        confirmation.textContent =
            "Couldn't connect right now. Please try again.";
    } finally {
        isPublishing = false;
        publishButton.disabled = false;
    }
}


// START WEBSITE

async function startWebsite() {
    try {
        await ensureAnonymousSession();
    } catch (error) {
        console.error("Anonymous sign-in failed:", error);
    }

    // Public posts can still be read even if sign-in fails.
    await loadPosts();
}

startWebsite();
