
/*
	InACTually
	> interactive theater for actual acts
	> this file is part of the "InACTually Stage", a spatial Interface for orchestrating interactive Media

	Copyright(c) 2023–2025 Fabian Töpfer, Lars Engeln
	Copyright(c) 2025 InACTually Community
	Licensed under the MIT License.
	See LICENSE file in the project root for full license information.

	This file is created and substantially modified: 2023-2025

	contributors:
	Fabian Töpfer - baniaf@uber.space
	Anton Hörig - dev@antonhoerig.de
*/

import * as THREE from "three";

export enum GridMode {
	GM_LINEAR,
	GM_RADIAL,
	GM_NONE
}

export default class GridManager {

	public constructor(scene: THREE.Scene) {
		this.setup(scene);
	}

	private m_currentGridMode: GridMode = GridMode.GM_LINEAR;

	private m_gridLinear = new THREE.GridHelper();
	private m_gridRadial = new THREE.PolarGridHelper();

	setup(scene: THREE.Scene) {

		this.m_gridLinear = new THREE.GridHelper(20, 100, 0xAFC8FF , 0xAFC8FF );
		this.m_gridLinear.position.set(0, 0, 0);
		this.m_gridLinear.visible = false;

		this.m_gridLinear.material.transparent = true;
		this.m_gridLinear.material.opacity = 0.3;

		this.m_gridRadial = new THREE.PolarGridHelper(5, 16, 8, 64, 0xffffff, 0xeeeeee);
		this.m_gridRadial.position.set(0, 0, 0);
		this.m_gridRadial.visible = false;

		scene.add(this.m_gridLinear);
		scene.add(this.m_gridRadial);

		this.setCurrentGrid(this.m_currentGridMode, 10);
	}

	getCurrentGridMode() {
		return this.m_currentGridMode;
	};

	setCurrentGrid(mode: GridMode, size: Number) {
		this.m_currentGridMode = mode;

		this.m_gridLinear.visible = mode === GridMode.GM_LINEAR;
		this.m_gridRadial.visible = mode === GridMode.GM_RADIAL;
	}

	update() {

	}
}
