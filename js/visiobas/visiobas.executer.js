(function() {
	/**
	* scope of predefined method like "VB."
	*/
	function VisiobasPredefined() {
		this.controls = {};
	}

	VisiobasPredefined.prototype.Read = function(id) {
		//return Math.random() * 100;
	};

	VisiobasPredefined.prototype.Write = function(id, val) {
		//return true;
	};

	VisiobasPredefined.prototype.Fan = function(id) {
		console.log("creating new fan... " + id);
		return Fan(id);
	};

	VisiobasPredefined.prototype.Controls = function(id) {
		return this.controls[id];
	};

  /**
	* register some control
	*/
	VisiobasPredefined.prototype.Register = function(control) {
		if (control.type === "fan") {
			this.controls[control.id] = Fan(control)
		}
	};

	function VisiobasExecuter() {
		let predefined = new VisiobasPredefined();

		return {
			execute: execute
		};

		/**
		* @param {string} code to execute
		*/
		function execute(code) {
			(new Function("var VB = this;" + code)).bind(predefined)();
		}
	}

	window.VISIOBAS_EXECUTER = VisiobasExecuter();
})();
