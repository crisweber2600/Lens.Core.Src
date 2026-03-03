---
name: 'create-story'
description: 'Creates a dedicated story file with all the context the agent will need to implement it later. Use when the user says ""create the next story"" or ""create story [story identifier]""'
---

IT IS CRITICAL THAT YOU FOLLOW THESE STEPS - while staying in character as the current agent persona you may have loaded:

<steps CRITICAL="TRUE">
1. Always LOAD the FULL @bmad.lens.release/_bmad/core/tasks/workflow.yaml
2. READ its entire contents - this is the CORE OS for EXECUTING the specific workflow-config @bmad.lens.release/_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml
3. Pass the yaml path @bmad.lens.release/_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml as 'workflow-config' parameter to the workflow.yaml instructions
4. Follow workflow.yaml instructions EXACTLY as written to process and follow the specific workflow config and its instructions
5. Save outputs after EACH section when generating any documents from templates
</steps>
