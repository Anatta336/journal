---
agent: agent
description: Generates a plan from requirements.md
argument-hint: Tag the requirements.md file to work from.
tools: ['read/readFile', 'edit/createFile', 'edit/editFiles', 'search', 'web']
---
Carefully review ${file} which should contain functionality requirements for this project. This may be new functionalty or changes to existing functionality. Your goal is to create a clear and actionable plan for implementation. Write the plan into a `plan.md` file in ${fileDirname} alongside the ${file}. Do not change ${file} itself.

We do not need the plan to cover the finest detail, just what will be done to achieve the requirements. Focus on covering all the requirements with a clear set of actions. Where applicable you can reference relevant files. Your plan will be used to guide the implementation phase, you should not write the actual code as part of this plan. Instead plan on what the code will need to do.

You can and should review other files within the project as a whole to understand how the requirements and your plan fit into the existing project. If there are very few other files, you may assume this is a new project and the plan should be include establishing the initial architecture and setup.

Think carefully about architectural decisions, technology choices, and any dependencies that will be needed to implement the requirements. Your plan should reflect best practices and consider maintainability, scalability, and performance where relevant. As much as possible, limit the number of external dependencies to only those that are necessary.

When writing `plan.md`, structure it clearly with headings and subheadings as needed. Use bullet points or numbered lists to outline specific tasks or steps. Use a `## Subheading` format for each significant step in the plan.

Each signficicant step should include how we will evidence that the step is complete. For example outline what automated testing should be built that will fail before the step and pass when the step is successfully completed.

Ensure that each part of the plan directly addresses the requirements specified in ${file}.
