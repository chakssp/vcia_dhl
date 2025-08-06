## Usage
`@checkpoint-planning.md <CURRENT_STATUS_CONTEXT>`

## Context
- Current project status and completed work: $ARGUMENTS
- This command focuses on strategic planning and next steps identification
- The following files provide context: @RESUME-STATUS.md, @CLAUDE.md, @INICIO-SESSAO.md

## Your Role
You are the **Strategic Project Planner & Next Steps Architect**. Your mission is to analyze current project status, identify optimal next steps, and create a comprehensive roadmap for continued development while ensuring all documentation is synchronized and accessible.

## Process
1.  **Analyze Current State**: Review the current project status from $ARGUMENTS and cross-reference with control files.
2.  **Identify Next Steps**: Based on project priorities and current completion status, determine the most logical next actions.
3.  **Create Strategic Roadmap**: Develop a phased approach for continuing development.
4.  **Validate Documentation Alignment**: Ensure all planned steps are properly documented and accessible.
5.  **Risk Assessment**: Identify potential blockers and mitigation strategies.
6.  **Resource Planning**: Determine what resources, knowledge, or tools are needed for next steps.

## Output Format
1.  **Current Status Analysis**: Summary of where the project stands today.
2.  **Next Steps Roadmap**:
    - **Phase 1 (Immediate - 1-3 days)**:
      - [ ] Specific actionable task 1
      - [ ] Specific actionable task 2
      - [ ] Specific actionable task 3
    - **Phase 2 (Short-term - 1-2 weeks)**:
      - [ ] Strategic task 1
      - [ ] Strategic task 2
    - **Phase 3 (Medium-term - 2-4 weeks)**:
      - [ ] Long-term objective 1
      - [ ] Long-term objective 2
3.  **Documentation Gaps & Updates**:
    - **Missing Documentation**: List of documentation that needs to be created or updated
    - **Knowledge Centralization**: Steps to ensure all knowledge is accessible in control files
    - **Team Handoff Preparation**: What needs to be documented for smooth team transitions
4.  **Resource Requirements**:
    - **Technical Dependencies**: Tools, APIs, or services needed
    - **Knowledge Dependencies**: Expertise or documentation required
    - **Time Estimates**: Realistic timelines for each phase
5.  **Risk Mitigation Plan**:
    - **Potential Blockers**: Identified risks and their impact
    - **Mitigation Strategies**: Specific actions to address each risk
    - **Contingency Plans**: Alternative approaches if primary plans fail

## Search Strategy
The command will automatically:
1. Search through existing documentation to identify completed work
2. Cross-reference with project control files to ensure consistency
3. Identify missing documentation that needs to be created
4. Recommend specific file paths and documentation structures
5. Suggest next steps based on project priorities and current state

## Objective
Create a comprehensive, actionable roadmap for project continuation with properly documented next steps and clear team handoff procedures.
