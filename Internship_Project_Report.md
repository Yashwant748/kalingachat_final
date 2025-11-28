# KalingaAI: Intelligent Academic Inquiry System

**A Project Report Submitted in Partial Fulfillment of the Requirements for the Degree of**

**Bachelor of Computer Applications (BCA)**
**(Artificial Intelligence & Machine Learning)**

**Session: 2024–2025**

<br>
<br>

**Submitted by:**

**Name:** Yashwant Pan
**Enrollment No:** 23071417624310
**Roll No:** 25121437
**Semester:** 5th Semester

<br>
<br>

**Under the Guidance of:**
[To be updated after allocation]

<br>
<br>

![Kalinga University Logo Placeholder]
*(Insert Kalinga University Logo Here)*

**Department of Computer Science & Information Technology**
**Kalinga University, Raipur (C.G.)**

---

## CERTIFICATE

This is to certify that the project report titled **"KalingaAI: Intelligent Academic Inquiry System"** submitted by **Yashwant Pan** (Enrollment No: **23071417624310**, Roll No: **25121437**) in partial fulfillment of the requirements for the award of the degree of **Bachelor of Computer Applications (AIML)** is a bona fide work carried out by him under my supervision and guidance.

To the best of my knowledge, the matter embodied in this project report has not been submitted to any other University or Institute for the award of any degree or diploma.

<br>
<br>
<br>

**Signature of Guide**
[Name of Guide]
[Designation]
Kalinga University, Raipur

<br>
<br>

**Signature of HOD**
[Name of HOD]
Department of CS & IT
Kalinga University, Raipur

---

## ACKNOWLEDGMENT

I would like to express my deep sense of gratitude to **Kalinga University, Raipur**, for providing me with the opportunity to undertake this project work.

I am extremely thankful to my project guide, **[Name of Guide]**, for their valuable guidance, constant encouragement, and constructive criticism throughout the development of this project. Their expertise and support have been instrumental in the successful completion of this work.

I also extend my thanks to the **Head of Department**, Department of Computer Science & IT, for their support and for providing the necessary facilities to carry out this project.

Finally, I would like to thank my parents and friends for their unwavering support and motivation during this journey.

<br>
<br>

**Yashwant Pan**
BCA (AIML), 5th Semester

---

## ABSTRACT

In the rapidly evolving landscape of educational technology, there is a growing need for intelligent systems that can assist students and faculty with instant, accurate information. **KalingaAI** is a specialized chatbot application designed to serve as a virtual assistant for Kalinga University.

This project aims to bridge the communication gap between the university's vast information resources and its stakeholders. Leveraging modern web technologies and Artificial Intelligence, KalingaAI provides a user-friendly interface for querying information related to admissions, courses, campus facilities, and academic schedules.

The system is built using a robust technology stack comprising **React.js** for the frontend, **Node.js** and **Express** for the backend, and **PostgreSQL** for data management. It integrates advanced Large Language Models (LLMs) like **TinyLlama** (via Ollama) to generate natural, context-aware responses. Key features include real-time chat, conversation history management, secure user authentication, and a responsive design optimized for all devices.

This report details the development process, system architecture, implementation challenges, and the potential impact of KalingaAI on the university's digital ecosystem.

---

## TABLE OF CONTENTS

1. **Introduction**
2. **Literature Review**
3. **System Requirements**
4. **System Architecture**
5. **Methodology**
6. **Technologies Used**
7. **System Design**
8. **Implementation**
9. **Results & Output**
10. **Testing & Evaluation**
11. **Limitations**
12. **Future Scope**
13. **Conclusion**
14. **References**
15. **Appendix**

---

## CHAPTER 1: INTRODUCTION

### 1.1 Overview
The "KalingaAI" project is an initiative to develop an intelligent conversational agent tailored for the specific needs of Kalinga University. In an era where information accessibility is paramount, traditional methods of browsing through static websites or visiting administrative offices can be time-consuming. KalingaAI addresses this by offering a conversational interface where users can ask questions in natural language and receive instant, relevant answers.

### 1.2 Problem Statement
Students and visitors often struggle to find specific information scattered across various sections of the university website. Manual inquiry desks are limited by working hours and human resource availability. There is a need for a 24/7 automated system that can handle repetitive queries efficiently, allowing human staff to focus on more complex tasks.

### 1.3 Objectives
*   To develop a responsive web-based chatbot application.
*   To integrate an AI model capable of understanding and processing natural language queries.
*   To implement a secure authentication system for personalized user experiences.
*   To provide a scalable architecture that can be expanded with more university-specific data.
*   To ensure a modern, intuitive User Interface (UI) that aligns with current web standards.

### 1.4 Scope of the Project
The current scope includes the development of the web application, integration with a local LLM for response generation, and a database for storing user chat history. The system is designed to handle general inquiries and can be further trained on specific university datasets.

---

## CHAPTER 2: LITERATURE REVIEW

### 2.1 Evolution of Chatbots
The journey of chatbots began with ELIZA in the 1960s, a simple rule-based program. Over the decades, advancements in Natural Language Processing (NLP) have transformed chatbots from simple pattern-matchers to sophisticated AI agents capable of understanding context and sentiment.

### 2.2 AI in Education
Research shows that AI-powered assistants in educational institutions significantly improve student engagement and administrative efficiency. Universities worldwide are adopting chatbots to handle admissions, library services, and student support, reducing response times and improving overall satisfaction.

### 2.3 Modern Web Frameworks
The shift towards Single Page Applications (SPAs) has made frameworks like React.js the standard for building dynamic user interfaces. Coupled with efficient backend runtimes like Node.js, developers can build full-stack applications that are both fast and scalable.

---

## CHAPTER 3: SYSTEM REQUIREMENTS

### 3.1 Hardware Requirements
*   **Processor:** Intel Core i5 or higher (Recommended for running local LLMs)
*   **RAM:** 8 GB minimum (16 GB recommended)
*   **Storage:** 500 MB free space for application code and dependencies
*   **Internet Connection:** Required for package installation and external API calls (if any)

### 3.2 Software Requirements
*   **Operating System:** Windows 10/11, macOS, or Linux
*   **Code Editor:** Visual Studio Code (VS Code)
*   **Runtime Environment:** Node.js (v18 or later)
*   **Package Manager:** npm or yarn
*   **Database:** PostgreSQL
*   **Browser:** Google Chrome, Mozilla Firefox, or Microsoft Edge
*   **AI Engine:** Ollama (for running TinyLlama locally)

---

## CHAPTER 4: SYSTEM ARCHITECTURE

The system follows a client-server architecture, ensuring a clear separation of concerns between the user interface and data processing logic.

### 4.1 High-Level Architecture

![System Architecture Diagram Placeholder]
*(Insert System Architecture Diagram Here - showing Client, Server, Database, and AI Model interaction)*

1.  **Client Layer:** Built with React and TypeScript, responsible for rendering the UI and handling user interactions.
2.  **API Layer:** An Express.js server that handles HTTP requests, authentication, and routing.
3.  **Service Layer:** Contains business logic, including the integration with the AI model.
4.  **Data Layer:** PostgreSQL database accessed via Drizzle ORM for storing user data and chat logs.

---

## CHAPTER 5: METHODOLOGY

The project was developed using the **Agile Methodology**, specifically the Scrum framework. This allowed for iterative development, regular feedback, and flexibility to adapt to changes.

### 5.1 Development Phases
1.  **Requirement Analysis:** Gathering requirements and defining the scope.
2.  **Design:** Creating UI mockups and database schema designs.
3.  **Implementation:** Coding the frontend and backend components.
4.  **Integration:** Connecting the frontend with the backend and the AI model.
5.  **Testing:** Unit testing and user acceptance testing to ensure reliability.
6.  **Deployment:** Preparing the application for production use.

---

## CHAPTER 6: TECHNOLOGIES USED

### 6.1 Frontend
*   **React.js:** A JavaScript library for building user interfaces.
*   **TypeScript:** A typed superset of JavaScript that enhances code quality and maintainability.
*   **Vite:** A build tool that provides a fast development environment.
*   **Tailwind CSS:** A utility-first CSS framework for rapid UI styling.
*   **Shadcn UI / Radix UI:** A collection of accessible and customizable UI components.
*   **Framer Motion:** A library for creating smooth animations.

### 6.2 Backend
*   **Node.js:** A JavaScript runtime built on Chrome's V8 engine.
*   **Express.js:** A minimal and flexible Node.js web application framework.
*   **Passport.js:** Middleware for handling authentication strategies.

### 6.3 Database & ORM
*   **PostgreSQL:** A powerful, open-source object-relational database system.
*   **Drizzle ORM:** A TypeScript ORM that ensures type safety and easy database interaction.

### 6.4 AI & Machine Learning
*   **Ollama:** A tool for running open-source LLMs locally.
*   **TinyLlama:** A compact language model used for generating responses efficiently on consumer hardware.

---

## CHAPTER 7: SYSTEM DESIGN

### 7.1 Data Flow Diagram (DFD)

![Data Flow Diagram Placeholder]
*(Insert DFD Level 0 and Level 1 Diagrams Here)*

### 7.2 Activity Diagram

![Activity Diagram Placeholder]
*(Insert Activity Diagram showing User Login -> Chat -> Logout flow)*

### 7.3 Database Schema
The database consists of two primary tables:
1.  **Users:** Stores user credentials (hashed passwords) and profile information.
2.  **Conversations:** Stores chat history, linked to specific users.

---

## CHAPTER 8: IMPLEMENTATION

### 8.1 Folder Structure
The project is organized into a clean structure separating client and server code:

```
kalingachat/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   └── lib/            # Utility functions
├── server/                 # Backend Express application
│   ├── routes.ts           # API route definitions
│   ├── storage.ts          # Database interaction logic
│   └── index.ts            # Server entry point
└── package.json            # Project dependencies
```

### 8.2 Key Modules

#### Authentication Module
Handles user registration and login using secure password hashing (bcrypt) and session management.

#### Chat Interface
A responsive chat window that displays messages in real-time, supports markdown formatting, and includes a sidebar for conversation history.

![Chat Interface Screenshot Placeholder]
*(Insert Screenshot of the main Chat Interface)*

#### AI Integration Service
A dedicated service module that communicates with the Ollama API to send user prompts and receive generated text.

---

## CHAPTER 9: RESULTS & OUTPUT SECTION

The final application successfully demonstrates a functional AI chatbot. Users can register, log in, and start conversations. The AI responds contextually, and the interface mimics modern chat applications like ChatGPT.

### 9.1 Login Screen
![Login Screen Screenshot Placeholder]
*(Insert Screenshot of Login Page)*

### 9.2 Chat Experience
![Chat Conversation Screenshot Placeholder]
*(Insert Screenshot showing a conversation with the bot)*

### 9.3 Mobile View
![Mobile View Screenshot Placeholder]
*(Insert Screenshot of the application on a mobile device)*

---

## CHAPTER 10: TESTING & EVALUATION

### 10.1 Unit Testing
Individual components such as the "Button" and "Input" fields were tested to ensure they render correctly and handle events as expected.

### 10.2 Integration Testing
The communication between the React frontend and the Express backend was tested using API tools (like Postman) to verify data exchange.

### 10.3 User Acceptance Testing (UAT)
Peers were invited to use the application to identify usability issues. Feedback regarding the color scheme and response speed was incorporated into the final build.

---

## CHAPTER 11: LIMITATIONS

*   **Hardware Dependency:** Running the AI model locally requires significant computational power.
*   **Knowledge Cutoff:** The local model may not have the most up-to-date information about the university unless specifically fine-tuned.
*   **Context Window:** Long conversations may lose context due to the token limit of the underlying model.

---

## CHAPTER 12: FUTURE SCOPE

*   **RAG Integration:** Implementing Retrieval-Augmented Generation (RAG) to fetch real-time data from the university website.
*   **Voice Support:** Adding speech-to-text and text-to-speech capabilities for accessibility.
*   **Multi-language Support:** Enabling the bot to converse in Hindi and other regional languages.
*   **Mobile App:** Developing a native mobile application using React Native.

---

## CHAPTER 13: CONCLUSION

The **KalingaAI** project successfully demonstrates the potential of integrating Artificial Intelligence into academic environments. By providing an accessible, 24/7 inquiry system, it enhances the digital experience for students and staff. The project not only fulfills the academic requirements of the BCA curriculum but also serves as a practical application of modern web development and AI technologies. It lays a strong foundation for future enhancements that could transform it into a central information hub for Kalinga University.

---

## CHAPTER 14: REFERENCES

1.  React Documentation. https://react.dev/
2.  Node.js Documentation. https://nodejs.org/en/docs/
3.  PostgreSQL Official Site. https://www.postgresql.org/
4.  Ollama - Get up and running with Llama 2. https://ollama.com/
5.  Tailwind CSS - Rapidly build modern websites. https://tailwindcss.com/

---

## CHAPTER 15: APPENDIX

### Additional Screenshots

![Settings Page Screenshot Placeholder]
*(Insert Screenshot of Settings/Profile Page)*

![Database Schema Diagram Placeholder]
*(Insert ER Diagram of the Database)*
