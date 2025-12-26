---
agent: agent
description: Asks questions to refine and clarify contents of requirements.md, ready to be turned into a plan.
argument-hint: Tag the requirements.md file to review.
tools: ['read/readFile', 'edit/createFile', 'edit/editFiles', 'search', 'web']
---
Carefully review ${file} which should contain functionality requirements for this project. This may be new functionalty or changes to existing functionality. Your goal is to identify ambiguities, missing information, or areas that need further clarification in order to create a clear and actionable plan for implementation. Write any questions into a `questions.md` file in ${fileDirname} alongside the ${file}. Do not change ${file} itself.

We do not need the requirements to cover every fine detail. That will be handled later during implementation. Focus on high-level clarity and completeness.

If enough information is already present in ${file} to proceed to the planning phase you should say so. Do not add questions unnecessarily.

You can optionally include a suggestion for the answer. Follow the format given below.

You can and should review other files within the project as a whole to understand how the requirements fit into the existing project. If there are very few other files, you may assume this is a new project and the requirements should be comprehensive enough to start development from scratch.

When reviewing the requirements, consider the following aspects:
1. **Clarity**: Are the requirements clearly stated? Are there any vague terms or phrases that could be interpreted in multiple ways?
2. **Completeness**: Do the requirements cover all necessary aspects of the feature or change? Are there any missing requirements that should be included?
3. **Consistency**: Are there any conflicting requirements? Do all requirements align with the overall goals of the project?
4. **Feasibility**: Are the requirements realistic and achievable considering what else you know about this project?

Remember this is defining the requirements in terms of what it should do, not how to implement it. We do not need to establish technical details or specific implementation strategies at this stage.

Add your questions to the `questions.md` file following the formatting of this example:
```markdown
## Q1. User information
The requirements mention storing users, but not what details about users should be stored.

### Answer
Suggestion: Email address, password (encrypted), and display name.

## Q2. Payment methods
How should payments be taken for the subscription service?

### Answer
Suggestion: Only support PayPal for now.
```

