# Design

This directory and its sub-directories are used to store information about the design of this project.

Development of substantial features should follow this process:

1. Run `init-feature.sh` with the name of the new feature, e.g. `./design/init-feature.sh My cool new feature`.
2. Write requirements in the `requirements.md` file that was generated.
3. Run `/requirements-refine` in your AI Agent, tagging the `requirements.md` file.
4. Either:
    1. Add answers to any questions raised in `answers.md` then run `/requirements-answers` tagging the `questions.md` file.
    2. Or, directly edit the `requirements.md` file to address questions.
5. Repeat steps 3 and 4 until the agent has no more questions, or you're convinced the requirements are clear.
6. Run `/plan-initial` in your AI Agent, tagging the `requirements.md` file.
7. Review and refine the generated `plan.md` as needed.
8. Run `/plan-implement` in your AI Agent, tagging the `plan.md` file.
    * This is typically the longest process, and if you're being charged per agent invocation this is a good place to use a powerful agent.
    * Starting a fresh context window is advised. The important information should all be in the `plan.md` file so the earlier context just adds noise.
9. Run `/plan-completed-check` in your AI Agent, tagging the `plan.md` file.
10. Test and review the implementation yourself, iterating to fix any issues.
