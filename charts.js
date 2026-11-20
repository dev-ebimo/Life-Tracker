// CHARTS.JS — shared SVG line-chart renderer.
// Generic SVG line-chart renderer shared by the Finance net-worth trend and the
// Personal task-completion trend graphs.
function renderTrendLine(svgIds, monthLog, valueFn, badgeId, yearLabelId, year, options = {}) {
    const trendLine = document.getElementById(svgIds.line);
    const nodesGroup = document.getElementById(svgIds.nodes);
    const xLabelsGroup = document.getElementById(svgIds.labels);
    if (!trendLine || !nodesGroup || !xLabelsGroup) return;

    nodesGroup.innerHTML = ""; xLabelsGroup.innerHTML = "";

    const values = monthLog.map(valueFn);
    // A fixedScale locks the chart's ceiling to a target value (e.g. a ₦1,000,000 goal)
    // instead of auto-scaling to whatever the data happens to reach — so the chart always
    // reads as "progress toward the goal" rather than a moving target.
    const maxAmount = options.fixedScale ? options.fixedScale : Math.max(...values, 1);
    let pathCoordinatesString = "";
    let firstActiveIdx = -1, lastActiveIdx = -1;

    monthLog.forEach((data, index) => {
        const xPos = 40 + (index * (450 / 11));
        const val = valueFn(data);
        // Clamp so a value that blows past a fixed scale still renders near the top
        // of the chart (visibly breaking out) instead of flying off-canvas.
        const rawY = 120 - ((val / maxAmount) * 110);
        const yPos = Math.max(rawY, -25);
        pathCoordinatesString += `${index === 0 ? 'M' : 'L'} ${xPos} ${yPos}`;

        if (val > 0 || (data.total !== undefined && data.total > 0)) {
            if (firstActiveIdx === -1) firstActiveIdx = index;
            lastActiveIdx = index;
            const circleNode = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circleNode.setAttribute("cx", xPos); circleNode.setAttribute("cy", yPos); circleNode.setAttribute("r", "4");
            circleNode.setAttribute("fill", "#fff"); circleNode.setAttribute("stroke-width", "2");
            const elementTooltip = document.createElementNS("http://www.w3.org/2000/svg", "title");
            elementTooltip.textContent = svgIds.tooltip(data);
            circleNode.appendChild(elementTooltip);
            nodesGroup.appendChild(circleNode);
        }

        const axisTextLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
        axisTextLabel.setAttribute("x", xPos); axisTextLabel.setAttribute("y", 135);
        axisTextLabel.setAttribute("text-anchor", "middle"); axisTextLabel.textContent = data.month;
        xLabelsGroup.appendChild(axisTextLabel);
    });
    trendLine.setAttribute("d", pathCoordinatesString);

    // Optional left-hand y-axis scale labels.
    // By default this draws 3 labels (0 / midpoint / ceiling of maxAmount). When
    // options.yStepBase is set (e.g. 5000 for the finance graph), gridlines are instead
    // spaced at a clean multiple of that step — the smallest multiple of yStepBase that
    // keeps the total number of gridlines at or under options.maxTicks, so the axis always
    // reads in round ₦5,000-based increments instead of arbitrary fractions.
    if (svgIds.yLabels) {
        const yLabelsGroup = document.getElementById(svgIds.yLabels);
        const yGridGroup = svgIds.yGrid ? document.getElementById(svgIds.yGrid) : null;
        if (yLabelsGroup) {
            yLabelsGroup.innerHTML = "";
            if (yGridGroup) yGridGroup.innerHTML = "";

            let tickValues;
            if (options.yStepBase) {
                const maxTicks = options.maxTicks || 6;
                let step = options.yStepBase;
                while ((maxAmount / step) > maxTicks) step += options.yStepBase;
                tickValues = [];
                for (let v = 0; v < maxAmount; v += step) tickValues.push(v);
                tickValues.push(maxAmount); // always cap the axis at the true ceiling
            } else {
                tickValues = [0, maxAmount * 0.5, maxAmount];
            }

            tickValues.forEach(val => {
                const frac = maxAmount > 0 ? (val / maxAmount) : 0;
                const yPos = 120 - (frac * 110);

                if (yGridGroup && val !== 0) {
                    const gridLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
                    gridLine.setAttribute("x1", 40); gridLine.setAttribute("x2", 490);
                    gridLine.setAttribute("y1", yPos); gridLine.setAttribute("y2", yPos);
                    gridLine.setAttribute("stroke", "rgba(255,255,255,0.05)");
                    gridLine.setAttribute("stroke-dasharray", "4");
                    yGridGroup.appendChild(gridLine);
                }

                const labelText = document.createElementNS("http://www.w3.org/2000/svg", "text");
                labelText.setAttribute("x", 34);
                labelText.setAttribute("y", yPos + 3);
                labelText.setAttribute("text-anchor", "end");
                labelText.textContent = options.formatY ? options.formatY(val) : val;
                yLabelsGroup.appendChild(labelText);
            });
        }
    }

    // Determine progress vs decline for the badge + line color.
    const badge = document.getElementById(badgeId);
    const yearLabel = document.getElementById(yearLabelId);
    if (yearLabel) yearLabel.textContent = year;

    if (badge) {
        if (firstActiveIdx === -1 || firstActiveIdx === lastActiveIdx) {
            badge.textContent = '— 0%';
            badge.className = 'trend-badge';
            trendLine.setAttribute('stroke', 'var(--primary)');
        } else {
            const startVal = valueFn(monthLog[firstActiveIdx]) || 0.0001;
            const endVal = valueFn(monthLog[lastActiveIdx]);
            const pctChange = ((endVal - startVal) / startVal) * 100;
            const arrow = pctChange >= 0 ? '▲' : '▼';
            badge.textContent = `${arrow} ${Math.abs(pctChange).toFixed(1)}%`;
            badge.className = `trend-badge ${pctChange >= 0 ? 'up' : 'down'}`;
            trendLine.setAttribute('stroke', pctChange >= 0 ? 'var(--success)' : 'var(--danger)');
        }
    }
}
