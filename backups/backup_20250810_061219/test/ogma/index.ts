import Ogma, { Node } from '@linkurious/ogma';

/**
 * Create the chart
 */
const ogma = new Ogma({
  container: 'graph-container',
  options: {
    interactions: { zoom: { onDoubleClick: true } }
  }
});

/**
 * Styling section
 */
const placeholder = document.createElement('span');
document.body.appendChild(placeholder);
placeholder.style.visibility = 'hidden';

// helper routine to get the icon HEX code
function getIconCode(className: string) {
  placeholder.className = className;
  const code = getComputedStyle(placeholder, ':before').content;
  return code[1];
}

const personIcon = getIconCode('icon-user');
const companyIcon = getIconCode('icon-building-2');
const isShareholderType = 'IS-SHAREHOLDER';

const getNodeColor = (node: Node) => {
  const group = node.getData('group');
  if (group === 'purple') return '#67328E';
  if (group === 'green') return '#328E5B';
  return '#DE8B53';
};

const getEdgeColor = edge => {
  if (edge.getData('type') === isShareholderType) return '#89C7D6';
  return '#8E6538';
};

const getEdgeHaloColor = edge => {
  if (edge.getData('type') === isShareholderType) return '#BDF2FF';
  return '#DABB98';
};

ogma.styles.addNodeRule({
  text: {
    minVisibleSize: 0,
    font: 'IBM Plex Sans'
  },
  color: 'white',
  outerStroke: {
    color: getNodeColor
  },
  icon: {
    font: 'Lucide',
    content: node => {
      if (node.getData('type') === 'company') {
        return companyIcon;
      }
      return personIcon;
    },
    style: 'bold',
    color: getNodeColor
  }
});

ogma.styles.setHoveredNodeAttributes({
  outline: false, // Disabling the shadow on hover
  outerStroke: {
    color: getNodeColor
  },
  text: {
    tip: false
  }
});

ogma.styles.addEdgeRule({
  shape: {
    head: 'arrow'
  },
  color: getEdgeColor
});

ogma.styles.setHoveredEdgeAttributes({
  outline: true,
  color: getEdgeColor,
  halo: getEdgeHaloColor,
  text: {
    backgroundColor: 'rgb(220, 220, 220)',
    minVisibleSize: 0
  }
});

const formatContent = ids => {
  if (!Array.isArray(ids)) {
    return ''; // this is for regular nodes
  }
  return (
    '<br/><br/>Contains:<ul/><li>"' + ids.join('"</li><li/>"') + '"</li></ul>'
  );
};

const createTooltip = (title: string, content: string, color: string) =>
  `<div class="arrow"></div>
  <div class="ogma-tooltip-header">
    <span class="title">${title}<span class="line-color" style="background: ${color}"></span>
    <div>
    ${formatContent(content)}</div>
  </div>`;

// Show some info from the hovered node
ogma.tools.tooltip.onNodeHover(
  node => {
    // pick the color of the node
    const color = node.getAttribute('outerStroke');
    // Now change the title based on the type of node (grouped or not?)
    const title = node.isVirtual()
      ? 'Grouped Area&nbsp;'
      : 'ID: "' + node.getId() + '"&nbsp;';
    // and pick the content of the node if grouped;
    const content = node.isVirtual() ? node.getData('ids') : node.getId();
    return createTooltip(title, content, color);
  },
  {
    className: 'ogma-tooltip' // tooltip container class to bind to css
  }
);

const graph = await Ogma.parse.jsonFromUrl('ownerships.json');
await ogma.setGraph(graph);
await ogma.layouts.force({ locate: { padding: 120 } });

const updateUI = () => {
  // Check what it should
  const nodeGrouped = getMode('node-group') === 'group';
  const edgeGrouped = getMode('edge-group') === 'group';

  // instead of working out how to go from state A to state B
  // execute all transformation and for each one workout what to do
  execute(edgeGrouping, edgeGrouped);
  execute(nodeGrouping, nodeGrouped);
  return ogma.transformations.afterNextUpdate().then(() => {
    return ogma.layouts.force();
  });
};

// this is the duration of the animations
const transitionTime = 500;
// Menu at the top right
const form = document.querySelector('#ui form')!;
form.addEventListener('change', updateUI);

document.querySelector('#layout')!.addEventListener('click', evt => {
  evt.preventDefault();
  ogma.layouts.force();
});

// transformation objects: create them now and use them later
const nodeGrouping = ogma.transformations.addNodeGrouping({
  selector: node => node.getData('type') === 'company',
  groupIdFunction: node => node.getData('group'),
  nodeGenerator: (nodeList, groupId) => ({
    id: 'grouped-node-' + groupId,
    attributes: {
      text: groupId + ' Group',
      radius: nodeList.size * 3,
      color: nodeList.getAttribute('icon').color
    },
    // add some content to be picked up later on in the tooltip
    data: {
      group: nodeList.getData('group')[0],
      type: nodeList.getData('type')[0],
      ids: nodeList.getId()
    }
  }),
  groupEdges: false, // do not group edges as for now
  enabled: false // create the transformation but do not activate it
});
const edgeGrouping = ogma.transformations.addEdgeGrouping({
  generator: (edgeList, groupId) => {
    const data = edgeList.getData()[0];
    return {
      id: groupId,
      data: data,
      attributes: {
        width: edgeList.size
      }
    };
  },
  enabled: false // create the transformation but do not activate it
});

const execute = (transformation, enable) => {
  // avoid extra work if we're already in the state requested
  if (transformation.isEnabled() === enable) {
    return;
  }
  transformation.toggle(transitionTime);
};

const getMode = id => {
  const select = form[id];
  const currentMode = Array.prototype.filter.call(select, input => {
    return input.checked;
  })[0].value; // IE inconsistency
  return currentMode;
};