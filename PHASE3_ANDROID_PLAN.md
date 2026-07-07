# Phase 3: Android App & Go-to-Market Checklist

This document outlines the strategy for migrating the web application to a native Android app (using Kotlin and the Android SDK) and preparing for market launch, adhering to product management principles.

## I. Product Validation (Before writing Kotlin code)
Based on the foundational rules:

*   **[ ] CustDev (Customer Development): Find the real pain point.**
    *   **Action:** Interview 10-15 target users (freelancers, shift workers, consultants) who track their hours.
    *   **Goal:** Don't ask "Would you use an app that tracks hours?" Ask "How do you track hours today? What is the most annoying part of that process?" The real pain might be *billing*, not tracking.
*   **[ ] R&D (Proof of Concept & Competitor Analysis):**
    *   **Action:** Analyze top 5 competitors on Google Play (Toggl, Clockify, etc.).
    *   **Goal:** Identify their weak spots. Is their UI too complex? Do they require an internet connection? Our PoC (the current PWA) proves that an offline-first, gesture-driven interface is viable.
*   **[ ] Pre-sale: Test demand as early as possible.**
    *   **Action:** Set up a landing page with a waitlist or a "Pre-order for $1" button before the APK is even finished.
    *   **Goal:** Verify that users are willing to pay for the *solution*, not just download a free toy.

## II. Technical Implementation: Android SDK & Kotlin

If the demand is validated, proceed with the native build:

*   **[ ] Architecture & Setup:**
    *   Initialize Android Studio Project with Kotlin DSL (`build.gradle.kts`).
    *   Choose Jetpack Compose for the UI layer (declarative UI matches React paradigms).
    *   Setup MVVM (Model-View-ViewModel) architecture.
*   **[ ] Data Persistence (Replacing IndexedDB):**
    *   Implement **Room Database** (SQLite wrapper) for offline-first data storage.
    *   Create Entities (`Entry`, `Settings`), DAOs, and Repositories.
*   **[ ] UI/UX Translation:**
    *   Translate Tailwind/CSS into Jetpack Compose Modifiers.
    *   Implement Haptic Feedback using Android's `Vibrator` and `HapticFeedbackConstants`.
    *   Ensure animations are smooth using Compose `AnimatedVisibility` and `animate*AsState`.
*   **[ ] Background Services & Chaos Engineering:**
    *   Implement Kotlin Coroutines / Flow for asynchronous operations.
    *   Port our "Chaos Engineering" scripts to Android equivalents (e.g., fuzzing the Room DB during automated Espresso tests, simulating Doze mode for the Amnesia trigger).
*   **[ ] Native Integrations:**
    *   File Export: Implement `MediaStore` or `FileProvider` API to export CSV/TXT files to the user's Downloads folder.
    *   Sharing: Implement Android `Intent.ACTION_SEND` for Telegram sharing.

## III. Pre-Launch & QA

*   **[ ] Alpha Testing (Internal):**
    *   Test heavily on different screen sizes (phones, tablets).
    *   Run Chaos tests via Android's built-in `monkey` tool (`adb shell monkey`).
*   **[ ] Beta Testing (Google Play Console):**
    *   Release a Closed Beta track to the CustDev participants.
    *   Collect crash logs via Firebase Crashlytics.
*   **[ ] App Store Optimization (ASO):**
    *   Draft engaging title, description (incorporating keywords discovered in R&D).
    *   Create high-quality screenshots showcasing the "Anti-AI" clean interface.

## IV. Launch & Iteration

*   **[ ] Production Release:** Roll out via Google Play.
*   **[ ] Customer Retention Monitoring:** 
    *   Monitor D1, D7, D30 retention rates.
    *   Avoid cheap dopamine traps (as mandated); focus on utility and speed (Core Web Vitals equivalent for Android).
