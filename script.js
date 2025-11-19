import { projects } from "./data.js";

document.addEventListener("DOMContentLoaded", () => {
  const lenis = new Lenis({ autoRef: true });

  // Function to update Lenis on each animation frame
  const raf = (t) => {
    lenis.raf(t);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);

  const projectsListContainer = document.querySelector(".project-list");
  // Alias for the projects list container (used for bounding box check)
  const projectsList = projectsListContainer;
  const projectPreview = document.querySelector(".project-preview");

  // Define vertical positions (y-axis offset) for the project text wrapper
  const POSITIONS = {
    BOTTOM: 0, // Default position when mouse exits from bottom
    MIDDLE: -80, // Position when mouse is hovering over the project
    TOP: -160, // Default position when mouse exits from top
  };

  let mouse = { x: 0, y: 0 };
  let activeProject = null;
  // Flag to prevent multiple requestAnimationFrame calls for updateProjects
  let rafScheduled = false;
  // Timer for idle state cleanup
  let idleTimer = null;

  // Function to create the HTML element for a single project
  const createProjectElement = (project) => {
    const el = document.createElement("div");
    el.className = "project";

    el.innerHTML = `
   <div class="project-wrapper">
    <div class="project-name">
     <h1>${project.name}</h1>
     <h2>${project.type}</h2>
    </div>
    <div class="project-project">
     <h3>${project.project}</h3>
     <h1>${project.label}</h1>
    </div>
    <div class="project-name">
     <h1>${project.name}</h1>
     <h2>${project.type}</h2>
    </div>
   </div>
  `;
    return el;
  };

  projects.forEach((a) =>
    projectsListContainer.appendChild(createProjectElement(a))
  );
  const projectsElements = [...document.querySelectorAll(".project")];

  // Function to check if a point (x, y) is inside a given rectangular bounding box (rect)
  const insideRect = (x, y, rect) =>
    x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

  // Function to remove all elements in a NodeList except the last one with a scale-out animation
  const removeAllExceptLast = (nodeList) => {
    // Stop if there's 1 or 0 elements
    if (nodeList.length <= 1) return;

    // Get the last element (the most recent preview image)
    const last = nodeList[nodeList.length - 1];
    nodeList.forEach((img) => {
      if (img === last) return;

      gsap.to(img, {
        scale: 0,
        duration: 0.4,
        ease: "power2.out",
        onComplete: () => img.remove(),
      });
    });
  };

  // Function to clear all preview images if the mouse is outside the main projects list area
  const clearPreviewIfOutside = () => {
    const rect = projectsList.getBoundingClientRect();

    if (!insideRect(mouse.x, mouse.y, rect)) {
      const imgs = projectPreview.querySelectorAll("img");

      imgs.forEach((img) => gsap.to(img, {
          scale: 0,
          duration: 0.4,
          ease: "power2.out",
          onComplete: () => img.remove(),
      }));
    }
  };

  // Main function to update the state of projects (text and active element)
  const updateProjects = () => {
    // Clear preview images if the mouse is outside the list container
    clearPreviewIfOutside();

    // Resetting non-active projects (Fix for fast cursor movement)
    projectsElements.forEach((project) => {
      const rect = project.getBoundingClientRect();
      const wrap = project.querySelector(".project-wrapper");
      const isInside = insideRect(mouse.x, mouse.y, rect);

      // Check if the project is NOT the currently hovered one AND the mouse is outside its bounds
      if (project !== activeProject && !isInside) {
        // Calculate the vertical center to determine the exit direction
        const centerY = rect.top + rect.height / 2;
        const shouldBeTop = mouse.y < centerY;

        // Force the project text wrapper to exit (TOP or BOTTOM position)
        gsap.to(wrap, {
          y: shouldBeTop ? POSITIONS.TOP : POSITIONS.BOTTOM,
          duration: 0.35,
          ease: "power2.out",
        });
      }
    });

    // Handling the active (currently hovered) project
    if (activeProject) {
      const rect = activeProject.getBoundingClientRect();
      const stillInside = insideRect(mouse.x, mouse.y, rect);

      // If the mouse has moved outside the active project
      if (!stillInside) {
        const wrap = activeProject.querySelector(".project-wrapper");
        // Determine the exit direction (top half or bottom half)
        const exitTop = mouse.y < rect.top + rect.height / 2;

        // Animate text wrapper to the TOP or BOTTOM exit position
        gsap.to(wrap, {
          y: exitTop ? POSITIONS.TOP : POSITIONS.BOTTOM,
          duration: 0.4,
          ease: "power2.out",
        });

        activeProject = null;
      }
    }

    // Activating a new project (Only run if no project is active)
    if (!activeProject) {
      // Loop through all projects to find a new hover state
      projectsElements.forEach((project) => {
        const rect = project.getBoundingClientRect();

        // If the mouse is currently inside a project
        if (insideRect(mouse.x, mouse.y, rect)) {
          const wrap = project.querySelector(".project-wrapper");

          // Animate the text wrapper to the MIDDLE position (hover state)
          gsap.to(wrap, {
            y: POSITIONS.MIDDLE,
            duration: 0.4,
            ease: "power2.out",
          });

          activeProject = project;
        }
      });
    }

    // Reset the RAF scheduled flag so the function can be called again
    rafScheduled = false;
  };

  // Event listener for mouse movement across the document
  document.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;

    if (idleTimer) clearTimeout(idleTimer);

    // Check if mouse is inside the projects list for idle cleanup logic
    const listRect = projectsList.getBoundingClientRect();
    if (insideRect(mouse.x, mouse.y, listRect)) {
      // Set a new idle timer to perform image cleanup after 2000ms of no movement
      idleTimer = setTimeout(() => {
        const imgs = projectPreview.querySelectorAll("img");
        // Clean up all images except the last one
        removeAllExceptLast(imgs);
      }, 2000);
    }

    // Run the function to clear previews if the mouse is outside the list
    clearPreviewIfOutside();

    // Schedule the updateProjects function to run on the next animation frame if not already scheduled
    if (!rafScheduled) {
      requestAnimationFrame(updateProjects);
      rafScheduled = true;
    }
  });

  document.addEventListener(
    "scroll",
    () => {
      // Schedule the updateProjects function to run on the next animation frame if not already scheduled
      if (!rafScheduled) {
        requestAnimationFrame(updateProjects);
        rafScheduled = true;
      }
    },
    { passive: true }
  );

  // Loop through each project element to attach mouseenter/mouseleave listeners
  projectsElements.forEach((project, index) => {
    const wrap = project.querySelector(".project-wrapper");
    // Initialize the current vertical position of the text wrapper
    let currentPos = POSITIONS.TOP;

    project.addEventListener("mouseenter", (e) => {
      activeProject = project;

      const rect = project.getBoundingClientRect();
      // Check if the mouse entered from the top half
      const enterTop = e.clientY < rect.top + rect.height / 2;

      // Move text to the MIDDLE position if entering from the top OR if the text is currently at the BOTTOM position
      if (enterTop || currentPos === POSITIONS.BOTTOM) {
        currentPos = POSITIONS.MIDDLE;
        gsap.to(wrap, {
          y: POSITIONS.MIDDLE,
          duration: 0.4,
          ease: "power2.out",
        });
      }

      const img = document.createElement("img");
      img.src = `images/project (${index + 1}).png`; // Changed image path to 'project'
      img.style.position = "absolute";
      img.style.top = 0;
      img.style.left = 0;
      img.style.scale = 0;
      // Set a unique z-index to ensure new images are on top
      img.style.zIndex = Date.now();

      projectPreview.appendChild(img);

      gsap.to(img, {
        scale: 1,
        duration: 0.4,
        ease: "power2.out",
      });
    });

    // Event listener for mouse leaving a project element
    project.addEventListener("mouseleave", (e) => {
      activeProject = null;

      const rect = project.getBoundingClientRect();
      // Check if the mouse is leaving from the top half
      const leaveTop = e.clientY < rect.top + rect.height / 2;

      // Set the new exit position (TOP or BOTTOM)
      currentPos = leaveTop ? POSITIONS.TOP : POSITIONS.BOTTOM;

      gsap.to(wrap, {
        y: currentPos,
        duration: 0.4,
        ease: "power2.out",
      });
    });
  });
});
