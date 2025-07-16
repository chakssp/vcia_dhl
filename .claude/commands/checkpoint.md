## Usage
`@checkpoint.md <RAW_AGENT_STATUS_REPORT>`

## Context
- The complete, unstructured status report from the development agent is provided as $ARGUMENTS.
- This command MUST perform an incremental update, NOT a full replacement, of the project's control files.
- The following files are MANDATORY context for diff analysis: @CLAUDE.md, @RESUME-STATUS.md, @INICIO-SESSAO.md

## Your Role
You are the **Project Documentation Integrator & Phase Validator**. Your mission is to parse agent reports, validate documentation completeness, generate incremental patches for control files, and prepare clear homologation plans. You must strictly adhere to all project LEIS[1] during this process.

## Process
1.  **Parse Agent Report**: Extract key information from $ARGUMENTS: Sprint progress, completion percentages, implemented features, next priorities, and architectural changes.
2.  **Validate Documentation Completeness**: Verify that all critical documentation is properly referenced and accessible in control files (@RESUME-STATUS.md, @CLAUDE.md, @INICIO-SESSAO.md).
3.  **Identify Knowledge Gaps**: Detect any missing documentation or knowledge gaps that could impact project continuity.
4.  **Generate Incremental Patches**: Create specific, incremental updates for each control file. **NEVER propose replacing entire files.**
5.  **Prepare Homologation Plan**: Based on current status, provide a clear plan for phase approval with acceptance criteria and next steps.
6.  **Ensure Team Synchronization**: Guarantee that proposed updates facilitate knowledge transfer between developers.

## Output Format
1.  **Checkpoint Summary**: Brief summary of the milestone being registered.
2.  **Documentation Completeness Report**: 
    | Control File | Status | Missing Elements | Action Required |
    | :-- | :--- | :--- | :--- |
    | @RESUME-STATUS.md | ✅ Complete / ❌ Incomplete | Brief description of gaps | Specific action needed |
    | @CLAUDE.md | ✅ Complete / ❌ Incomplete | Brief description of gaps | Specific action needed |
    | @INICIO-SESSAO.md | ✅ Complete / ❌ Incomplete | Brief description of gaps | Specific action needed |
3.  **Incremental Update Plan**:
    - **FILE TO UPDATE:** `RESUME-STATUS.md`
      - **PROPOSED PATCH:**
        ```
        --- a/RESUME-STATUS.md
        +++ b/RESUME-STATUS.md
        @@ -XX,X +XX,X @@
        + [Specific incremental changes here]
        ```
    - **FILE TO UPDATE:** `CLAUDE.md`
      - **PROPOSED PATCH:** [Similar format]
    - **FILE TO UPDATE:** `INICIO-SESSAO.md`
      - **PROPOSED PATCH:** [Similar format]
4.  **Homologation Plan**:
    - **Phase Completion Criteria**: Clear checklist for phase approval
    - **Acceptance Testing**: Specific validation steps
    - **Next Phase Prerequisites**: What needs to be ready for the next phase
    - **Risk Assessment**: Potential issues and mitigation strategies
5.  **Team Synchronization Plan**:
    - **Knowledge Transfer Actions**: Specific steps for developer handoff
    - **Documentation Updates**: Required documentation changes
    - **Communication Requirements**: What needs to be communicated to the team

## Additional Context Requirements
When invoking this command, provide the following context:
- Verify that all project documentation data is properly recorded in @RESUME-STATUS.md
- Identify any documentation gaps that could impact project continuity
- Prepare recommendations for phase approval with complete and centralized documentation
- Ensure proposed updates facilitate knowledge transfer between developers

## Objective
Prepare the project for phase approval with complete, centralized documentation and clear next steps for team continuity.
