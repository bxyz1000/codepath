const transcripts = [
  // HTML course matches
  {
    course: "HTML Full Course",
    videoTitle: "HTML Course for Beginners (2026 Edition)",
    youtubeUrl: "https://www.youtube.com/watch?v=kUMe1FH4CHE",
    segments: [
      {
        timestamp: "00:05:20",
        seconds: 320,
        text: "Welcome to the introduction of HTML. HTML stands for HyperText Markup Language. It forms the structure of any website you build. Today we start with tags, elements, and simple attributes."
      },
      {
        timestamp: "00:22:15",
        seconds: 1335,
        text: "HTML forms are essential. We use the form tag, input tags, label tags, and buttons to capture user input. Always use the action and method attributes to set up form submission behavior."
      },
      {
        timestamp: "00:45:10",
        seconds: 2710,
        text: "Let's discuss semantic HTML. Semantic tags like header, nav, main, article, section, footer, and aside make your webpage accessible and improve SEO by telling search engines exactly what each part of your page represents."
      }
    ]
  },
  // CSS course matches
  {
    course: "CSS Masterclass",
    videoTitle: "Learn CSS in 2 Hours",
    youtubeUrl: "https://www.youtube.com/watch?v=1Rs2ND1ryYc",
    segments: [
      {
        timestamp: "00:12:40",
        seconds: 760,
        text: "CSS selectors tell the browser which elements to style. We have element selectors, class selectors starting with dot, ID selectors starting with hash, and pseudo-classes like hover or active."
      },
      {
        timestamp: "00:28:15",
        seconds: 1695,
        text: "The CSS box model is the foundation of page layout. Every element is represented as a rectangular box. It consists of content, padding, border, and margin. box-sizing: border-box is crucial to control sizing."
      },
      {
        timestamp: "00:48:30",
        seconds: 2910,
        text: "Flexbox, or the Flexible Box Layout, makes it easy to design responsive, one-dimensional layouts. Use display: flex, justify-content for alignment on the main axis, and align-items for the cross axis."
      },
      {
        timestamp: "01:10:05",
        seconds: 4205,
        text: "CSS Grid is a two-dimensional layout system. Unlike Flexbox, which is one-dimensional, Grid allows you to lay items out in columns and rows simultaneously using grid-template-columns and grid-template-rows."
      },
      {
        timestamp: "01:35:45",
        seconds: 5745,
        text: "Responsive design uses media queries to apply CSS rules based on device properties like screen width. For example, @media (max-width: 768px) helps us style layout shifts for mobile screens."
      }
    ]
  },
  // JavaScript course matches
  {
    course: "JavaScript Complete Course",
    videoTitle: "Modern JavaScript Deep Dive",
    youtubeUrl: "https://www.youtube.com/watch?v=c-I5S_zTwAc",
    segments: [
      {
        timestamp: "00:15:30",
        seconds: 930,
        text: "Variables in JavaScript can be declared using let, const, and var. Scope plays a big role: var is function-scoped while let and const are block-scoped. We prefer const by default unless reassigning."
      },
      {
        timestamp: "00:42:10",
        seconds: 2530,
        text: "Functions are block-level structures that execute code when invoked. We can write standard function declarations, function expressions, or modern arrow functions which do not bind their own 'this' context."
      },
      {
        timestamp: "01:05:15",
        seconds: 3915,
        text: "Arrays and objects are the primary data collections. We manipulate arrays using map, filter, reduce, push, pop, slice, and splice. Objects store key-value pairs and are accessed using dot or bracket notation."
      },
      {
        timestamp: "01:38:20",
        seconds: 5900,
        text: "The DOM, or Document Object Model, is the programming interface for web documents. We select elements using querySelector or getElementById, and manipulate styles, attributes, and classes using JavaScript."
      },
      {
        timestamp: "02:13:45",
        seconds: 8025,
        text: "What is event bubbling? Event bubbling is a process where when an event triggers on an element, the handlers on the element run first, then the parent's handlers run, and so on up to the document object."
      },
      {
        timestamp: "02:45:50",
        seconds: 9950,
        text: "Async JavaScript involves callbacks, promises, and the async/await syntax. Async await allows us to write asynchronous code that looks and behaves like synchronous code, using try-catch blocks for error handling."
      }
    ]
  },
  // Backend course matches
  {
    course: "Node.js & Express Guide",
    videoTitle: "Fullstack Backend Development Course",
    youtubeUrl: "https://www.youtube.com/watch?v=ENrzD9HAZK4",
    segments: [
      {
        timestamp: "00:10:15",
        seconds: 615,
        text: "Node.js is a runtime environment that allows you to run JavaScript code outside of the browser, directly on your system or server. It is built on Google Chrome's V8 engine and supports non-blocking I/O."
      },
      {
        timestamp: "00:32:40",
        seconds: 1960,
        text: "Express is a fast, minimal web framework for Node.js. It simplifies writing server routes, handling HTTP requests, parsing payloads, and serving static content or APIs using middleware."
      },
      {
        timestamp: "01:05:00",
        seconds: 3900,
        text: "REST APIs allow clients to communicate with servers using HTTP verbs like GET to read data, POST to create, PUT/PATCH to update, and DELETE to remove resource instances in a standardized structure."
      },
      {
        timestamp: "01:40:30",
        seconds: 6030,
        text: "Authentication verifies a user's identity. We use middleware to protect private API routes, verifying tokens like JWT (JSON Web Tokens) or session cookies sent by the client."
      },
      {
        timestamp: "02:20:15",
        seconds: 8415,
        text: "Databases are where we persist our system data. Relational databases like PostgreSQL use SQL schemas, while Non-Relational databases like MongoDB use flexible BSON documents. We connect via drivers or ORMs."
      }
    ]
  }
];

module.exports = transcripts;
