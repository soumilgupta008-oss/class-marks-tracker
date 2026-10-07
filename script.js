/* =========================
   SUPABASE SETTINGS
   Paste your own values here (Project Settings -> API)
   Use the anon / public key ONLY, never service_role
   ========================= */

const SUPABASE_URL = "https://balnaxsnbuehmbhlbcrm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbG5heHNuYnVlaG1iaGxiY3JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMjQxMjgsImV4cCI6MjEwNjkwMDEyOH0.BaBr0cEehH7Pkq8KhThMMBxNYjqmaeqeCbp7EA3MD9U";

const db = window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;


/* =========================
   DATA
   ========================= */

const examOptions = {

    python: [
        "Assessment 1",
        "Assessment 2",
        "Assessment 3",
        "Assessment 4",
        "Assessment 5",
        "Assessment 6",
        "Assessment 7",
        "Assessment 8",
        "Assessment 9",
        "Assessment 10"
    ],

    chemistry: ["CAT-1", "CAT-2", "Quiz 1", "Quiz 2", "Quiz 3", "FAT"],

    math: ["CAT-1", "CAT-2", "Quiz 1", "Quiz 2", "Quiz 3", "FAT"],

    english: ["CAT-1", "CAT-2", "FAT"],

    "basic-engineering": ["CAT-1", "CAT-2", "FAT"]

};


const subjectNames = {
    python: "Python",
    chemistry: "Chemistry",
    math: "Math",
    english: "English",
    "basic-engineering": "Basic Engineering"
};


const examMaximumMarks = {

    "assessment-1": 20,
    "assessment-2": 20,
    "assessment-3": 20,
    "assessment-4": 20,
    "assessment-5": 20,
    "assessment-6": 20,
    "assessment-7": 20,
    "assessment-8": 20,
    "assessment-9": 20,
    "assessment-10": 20,

    "cat-1": 50,
    "cat-2": 50,

    "quiz-1": 10,
    "quiz-2": 10,
    "quiz-3": 10,

    "fat": 100

};


/* Minimum submissions before stats are shown.
   1 = always visible. Change to 3 for better anonymity. */
const MIN_SUBMISSIONS = 1;


/* =========================
   HELPERS
   ========================= */

function toKey(exam) {
    return exam.toLowerCase().replaceAll(" ", "-");
}


function getExamDisplayName(subject, examKey) {
    return examOptions[subject].find(function (e) {
        return toKey(e) === examKey;
    });
}


/* Random anonymous ID, contains no personal info */
function getDeviceId() {

    let id = localStorage.getItem("device_id");

    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem("device_id", id);
    }

    return id;
}


/* =========================
   PAGE 1
   ========================= */

const subjectGrid = document.getElementById("subject-grid");

if (subjectGrid) {

    const examContainer = document.getElementById("exam-container");
    const examGrid = document.getElementById("exam-grid");
    const continueButton = document.getElementById("continue-btn");

    let selectedSubject = "";
    let selectedExam = "";


    document
        .querySelectorAll(".selection-box[data-subject]")
        .forEach(function (button) {

            button.addEventListener("click", function () {

                document
                    .querySelectorAll(".selection-box[data-subject]")
                    .forEach(function (btn) {
                        btn.classList.remove("selected");
                    });

                this.classList.add("selected");

                selectedSubject = this.dataset.subject;
                selectedExam = "";

                continueButton.classList.add("hidden");
                examGrid.innerHTML = "";

                examOptions[selectedSubject].forEach(function (exam) {

                    const examButton = document.createElement("button");

                    examButton.className = "selection-box";
                    examButton.textContent = exam;
                    examButton.dataset.exam = toKey(exam);

                    examGrid.appendChild(examButton);

                    examButton.addEventListener("click", function () {

                        document
                            .querySelectorAll("#exam-grid .selection-box")
                            .forEach(function (btn) {
                                btn.classList.remove("selected");
                            });

                        this.classList.add("selected");

                        selectedExam = this.dataset.exam;

                        continueButton.classList.remove("hidden");

                    });

                });

                examContainer.classList.remove("hidden");

            });

        });


    continueButton.addEventListener("click", function () {

        if (!selectedSubject || !selectedExam) {
            return;
        }

        window.location.href =
            `marks.html?subject=${selectedSubject}&exam=${selectedExam}`;

    });

}


/* =========================
   PAGE 2
   ========================= */

const marksPage = document.querySelector(".marks-page");

if (marksPage) {

    const params = new URLSearchParams(window.location.search);

    const selectedSubject = params.get("subject");
    const selectedExam = params.get("exam");

    const isValid =
        selectedSubject &&
        selectedExam &&
        subjectNames[selectedSubject] &&
        examOptions[selectedSubject].some(function (e) {
            return toKey(e) === selectedExam;
        });

    if (!isValid) {
        window.location.replace("index.html");
    } else {
        initMarksPage();
    }


    function initMarksPage() {

        const pageTitle = document.getElementById("page-title");
        const pageSubtitle = document.getElementById("page-subtitle");
        const averageElement = document.getElementById("average");
        const submissionsElement = document.getElementById("submissions");
        const highestElement = document.getElementById("highest");
        const averageMax = document.getElementById("average-max");
        const highestMax = document.getElementById("highest-max");
        const emptyState = document.getElementById("empty-state");
        const markInput = document.getElementById("mark");
        const maximumMarks = document.getElementById("maximum-marks");
        const submitButton = document.getElementById("submit-btn");
        const errorMessage = document.getElementById("error-message");
        const backButton = document.getElementById("back-btn");

        const maxMarks = examMaximumMarks[selectedExam];
        const subjectExam = `${selectedSubject}_${selectedExam}`;
        const deviceId = getDeviceId();


        backButton.addEventListener("click", function () {
            window.location.href = "index.html";
        });


        pageTitle.textContent = subjectNames[selectedSubject];
        pageSubtitle.textContent =
            getExamDisplayName(selectedSubject, selectedExam);

        markInput.max = maxMarks;
        maximumMarks.textContent = `/ ${maxMarks}`;
        averageMax.textContent = `/ ${maxMarks}`;
        highestMax.textContent = `/ ${maxMarks}`;


        if (!db) {
            emptyState.textContent =
                "Could not connect to the database.";
            return;
        }


        /* =========================
           PRE-FILL MY MARK (for editing)
           ========================= */

        async function loadMyMark() {

            const { data } = await db.rpc("get_my_mark", {
                p_subject_exam: subjectExam,
                p_device_id: deviceId
            });

            if (data !== null && data !== undefined) {
                markInput.value = data;
                submitButton.textContent = "Update Marks";
            }

        }


        /* =========================
           DISPLAY STATS
           ========================= */

        async function displayStats() {

            const { data, error } = await db.rpc("get_stats", {
                p_subject_exam: subjectExam
            });

            if (error || !data || !data[0]) {
                emptyState.textContent = "Could not load statistics.";
                return;
            }

            const count = Number(data[0].submissions);

            submissionsElement.textContent = count;

            if (count === 0) {
                averageElement.textContent = "—";
                highestElement.textContent = "—";
                emptyState.textContent = "No submissions yet.";
                return;
            }

            if (count < MIN_SUBMISSIONS) {
                averageElement.textContent = "—";
                highestElement.textContent = "—";
                emptyState.textContent =
                    `Need ${MIN_SUBMISSIONS - count} more submission(s) to show stats.`;
                return;
            }

            averageElement.textContent =
                Number(data[0].average).toFixed(1);

            highestElement.textContent = Number(data[0].highest);

            emptyState.textContent =
                "Statistics are based on submitted marks.";

        }


        /* =========================
           SUBMIT
           ========================= */

        submitButton.addEventListener("click", async function () {

            const mark = parseFloat(markInput.value);

            errorMessage.classList.add("hidden");

            if (isNaN(mark) || mark < 0 || mark > maxMarks) {

                errorMessage.textContent =
                    `Please enter a mark between 0 and ${maxMarks}.`;

                errorMessage.classList.remove("hidden");

                return;

            }

            submitButton.disabled = true;

            const { error } = await db.rpc("submit_mark", {
                p_subject_exam: subjectExam,
                p_device_id: deviceId,
                p_mark: mark
            });

            submitButton.disabled = false;

            if (error) {

                errorMessage.textContent =
                    "Could not submit. Please try again.";

                errorMessage.classList.remove("hidden");

                return;

            }

            await displayStats();

            submitButton.textContent = "Submitted ✓";

            setTimeout(function () {
                submitButton.textContent = "Update Marks";
            }, 1500);

        });


        /* =========================
           INPUT RULES
           ========================= */

        markInput.addEventListener("keydown", function (event) {

            if (["e", "E", "+", "-"].includes(event.key)) {
                event.preventDefault();
                return;
            }

            if (event.key === "Enter") {
                submitButton.click();
            }

        });


        loadMyMark();
        displayStats();

        /* refresh every 10 seconds so the average stays live */
        setInterval(displayStats, 10000);

    }

}


/* =========================
   DESKTOP ORANGE ORB
   ========================= */

if (window.matchMedia("(min-width: 701px)").matches) {

    let mouseX = -180;
    let mouseY = -180;
    let orbX = -180;
    let orbY = -180;

    document.addEventListener("mousemove", function (event) {

        mouseX = event.clientX - 260;
        mouseY = event.clientY - 260;

    });

    function moveOrb() {

        orbX += (mouseX - orbX) * 0.035;
        orbY += (mouseY - orbY) * 0.035;

        document.body.style.setProperty("--orb-x", `${orbX}px`);
        document.body.style.setProperty("--orb-y", `${orbY}px`);

        requestAnimationFrame(moveOrb);

    }

    moveOrb();

}