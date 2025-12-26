---
agent: agent
description: Incorporate answers from questions.md back into requirements.md
argument-hint: Tag the questions.md file that you have added answers to.
tools: ['read/readFile', 'edit/createFile', 'edit/editFiles', 'search', 'web']
---
Carefully review ${file} which should contain answers to questions you previously asked about the `requirements.md` file in the same ${fileDirname} directory.

You MUST ignore any answers that begin with "Suggestion:". Answers that begin with "Suggestion:" were not written by the user and are not a source of truth. Leave those questions and answers in the file. The user still needs to answer them, and you should remind the user to do so.

Your goal is to incorporate the answers from ${file} back into the original `requirements.md` file to improve its clarity and completeness.

You should update the `requirements.md` file to reflect the answers given in ${file}`. DO NOT answer the questions yourself with your own ideas, only use the information given in the answers of ${file}.

You should also update ${file} to delete questions that have now been answered. If any answers need further clarification, or their answer begins with "Suggestion:" leave those questions in ${file} and add any necessary detail to the question for what information is needed.
