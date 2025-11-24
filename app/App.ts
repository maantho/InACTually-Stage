
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
	Lars Engeln - mail@lars-engeln.de
	Anton Hörig - dev@antonhoerig.de
*/

import InteractionManager from "./InteractionManager";
import Middleware from "./Network/Middleware";
import RoomManager from "./RoomManager";
import UI3D from "./View3D/UI3D";

export default class App {

	public UI3D = {} as UI3D;
	public middleware = new Middleware();
	public roomManager = new RoomManager(this.middleware);
	public interactionManager = new InteractionManager(this.middleware, this.roomManager);

	public canvas = undefined as HTMLElement | undefined;

	constructor(canvas: HTMLElement) {
		this.middleware.setup(this.roomManager);
		
		this.UI3D = new UI3D(canvas, this.roomManager);

		this.roomManager.draw(canvas, () => {
			this.roomManager.update();
			this.interactionManager.update();
			this.UI3D.update();
		});

		this.canvas = canvas;

		this.UI3D.setup();


		this.middleware.connect(9001);

		console.log("[APP]  STARTED RENDERING ");

		window.addEventListener("resize", () => this.onResize());
	}

	private onResize() {
		this.roomManager.onResize();
	}

	public switchProjection() {
		this.roomManager.stage.projectionManager.setIsOrthographicProjection(!this.roomManager.stage.projectionManager.getIsOrthographicProjection());
		this.UI3D.setCamera();
	}
	public setOrthoProjection(value: boolean) {
		this.roomManager.stage.projectionManager.setIsOrthographicProjection(value);
		this.UI3D.setCamera();
	}

	public connect() {
		this.middleware.connect(9001);
	}
}
