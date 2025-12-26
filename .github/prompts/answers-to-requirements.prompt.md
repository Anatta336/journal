---
agent: agent
description: Incorporate answers from questions.md back into requirements.md
argument-hint: Tag the questions.md file that you have added answers to.
tools: ['read/readFile', 'edit/createFile', 'edit/editFiles', 'search', 'web']
---
Carefully review ${file} which should contain answers to questions you previously asked about the `requirements.md` file in the same ${fileDirname} directory.

Your goal is to incorporate the answers from ${file} back into the original `requirements.md` file to improve its clarity and completeness.

You should update the `requirements.md` file to reflect the answers given in ${file}`. DO NOT answer the questions yourself with your own ideas, only use the information given in the answers of ${file}.

You should also update ${file} to delete questions that have now been answered. If any answers need further clarification, leave those questions in ${file} and add an explanation to the file of what more information is needed.
