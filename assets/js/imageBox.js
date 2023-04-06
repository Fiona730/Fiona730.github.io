var ImageBox = function(parent, config) {
	var box = this;
	
	this.elements = config.elements;
	this.names = config.names;
	this.imgWidth = config.imgWidth;
	
	this.selectorGroup = document.createElement("div"); 
	this.selectorGroup.className = "selector-group";
	
	this.imageDataArray = Array(this.elements.length);
	this.counter = 0;
	for (var i = 0; i < this.elements.length; i++) {
		this.getImagePixel(this.elements[i], i, this.elements.length, this.computeImageErrorAll);
	}

	this.selectors = [];
	for (var i = 0; i < this.elements.length; i++) {
		var selector = document.createElement("div");
		selector.className = "selector selector-primary";
		if (i == 0)
			selector.className += " active";
		selector.appendChild(document.createTextNode(this.names[i]));
		selector.appendChild(document.createElement("br"));
		if (i == 0)
			selector.appendChild(document.createTextNode("SMAPE:"));
		
		selector.addEventListener("mouseover", function(idx, event) {
			this.selectImage(idx);
		}.bind(this, i));
		
		this.selectors.push(selector);
		this.selectorGroup.appendChild(selector);
	}
	
	var title = document.createElement("h1"); 
	title.className = "image-box-title";
	title.appendChild(document.createTextNode(config.title));

	this.display = document.createElement("img"); 
	this.display.src = this.elements[0];
	this.display.className = "image-display";
	this.display.style.width = this.imgWidth + "px";
	
	this.containerDiv = document.createElement("div"); 
	this.containerDiv.className = "image-box";
	this.containerDiv.appendChild(title);
	this.containerDiv.appendChild(document.createElement("hr"));
	this.containerDiv.appendChild(this.selectorGroup);
	this.containerDiv.appendChild(this.display);

	document.addEventListener("keypress", function(event) { box.keyPressHandler(event); });
	
	if (config.enableInsets) {
		this.insetBox = document.createElement("div");
		this.insetBox.className = "image-inset-box";
		this.insetBox.style.display = 'none';
		document.body.appendChild(this.insetBox);
	
		this.insetZoom = config.insetZoom;
		this.insetSize = config.insetSize;
		//this.insetSize = Math.floor(Math.max(document.documentElement.clientWidth, window.innerWidth || 0)/this.elements.length) - 10;
		this.insets = []
		this.insetContainers = []
		for (var i = 0; i < this.elements.length; i++) {
			var insetImage = document.createElement("div");
			insetImage.className = "image-inset pixelated";
			insetImage.style.width = this.insetSize + "px";
			insetImage.style.height = this.insetSize + "px";
			insetImage.style.backgroundImage = "url('" + this.elements[i] + "')";
			insetImage.style.backgroundRepeat = "no-repeat";
			
			var insetContainer = document.createElement("div");
			insetContainer.className = "image-inset-container";
			insetContainer.style.width = this.insetSize + "px";
			insetContainer.appendChild(insetImage);
			insetContainer.appendChild(document.createTextNode(this.names[i]));
			
			this.insetBox.appendChild(insetContainer);
			this.insets.push(insetImage);
			this.insetContainers.push(insetContainer);
		}
		this.display.addEventListener("mouseover", function(event) { box.mouseOverHandler(); });
		this.display.addEventListener("mouseout",  function(event) { box.mouseOutHandler (); });
		this.display.addEventListener("mousemove", function(event) { box.mouseMoveHandler(event); });
		this.insetBox.addEventListener("mouseover", function(event) { box.mouseOverHandler(); });
		this.insetBox.addEventListener("mouseout",  function(event) { box.mouseOutHandler (); });
		this.insetBox.addEventListener("mousemove", function(event) { box.mouseMoveHandler(event); });
	}
	
	this.dummyImage = new Image();
	this.dummyImage.src = this.elements[0];
	this.dummyImage.addEventListener('load', function(e) { box.setupInsets(); });
	if (this.dummyImage.complete)
		this.setupInsets();
		
	
	parent.appendChild(this.containerDiv);
}

ImageBox.prototype.getImagePixel = function(src, idx, expectedCount, completeFunc) {
	var img = new Image();
	var curBox = this;
	img.src = src;
	img.onload = function() {
		var canvas = document.createElement('canvas');
		var context = canvas.getContext('2d');
		context.drawImage(this, 0, 0);
		var imageData = context.getImageData(0, 0, this.width, this.height).data;
		curBox.imageDataArray[idx] = imageData;
		if (++curBox.counter == expectedCount) {
			completeFunc(curBox);
		}
	}
}

ImageBox.prototype.computeImageError = function(curBox, srcIdx, gtIdx) {
	var error = 0;
	for (var i = 0; i < curBox.imageDataArray[srcIdx].length; i++) {
		// SMAPE (note: for PNG, not exr values!!)
		error += Math.abs(curBox.imageDataArray[srcIdx][i] - curBox.imageDataArray[gtIdx][i]) / (Math.abs(curBox.imageDataArray[srcIdx][i] + curBox.imageDataArray[gtIdx][i]) + 1e-3);
	}
	error /= curBox.imageDataArray[srcIdx].length;
	return error;
}

ImageBox.prototype.computeImageErrorAll = function(curBox) {
	for (var i = 1; i < curBox.elements.length; i++) {
		var error = curBox.computeImageError(curBox, i, 0);
		curBox.selectors[i].appendChild(document.createTextNode(error.toExponential(3)));
	}
}

ImageBox.prototype.setupInsets = function() {
	var format = this.dummyImage.naturalWidth *this.insetZoom + "px "
			   + this.dummyImage.naturalHeight*this.insetZoom + "px";
	for (var i = 0; i < this.insets.length; i++)
		this.insets[i].style.backgroundSize = format
}

ImageBox.prototype.selectImage = function(idx) {
	for (var i = 0; i < this.elements.length; i++) {
		if (i == idx) {
			this.selectors[i].className += " active";
		}
		else {
			this.selectors[i].className = this.selectors[i].className.replace( /(?:^|\s)active(?!\S)/g , '');
		}
	}

	this.display.src = this.elements[idx];
}

ImageBox.prototype.keyPressHandler = function(event) {
	var inc = event.charCode == "+".charCodeAt(0);
	var dec = event.charCode == "-".charCodeAt(0);
	if (inc || dec) {
		if (inc)
			this.insetSize *= 2;
		else
			this.insetSize /= 2;
		for (var i = 0; i < this.elements.length; i++) {
			var image = this.insetContainers[i].childNodes[0];
			image.style.width = this.insetSize + "px";
			image.style.height = this.insetSize + "px";
			this.insetContainers[i].style.width = this.insetSize + "px";
		}
	} else {
		var idx = parseInt(event.charCode) - "1".charCodeAt(0);
		if (idx >= 0 && idx < this.elements.length)
			this.selectImage(idx);
	}
}

ImageBox.prototype.mouseOverHandler = function() {
	/*for (var i = 0; i < this.insets.length; i++) {
		this.insets[i].style.backgroundImage = "url('" + this.elements[i] + "')";
		this.insetContainers[i].style.color = 'black';
	}*/
	this.insetBox.style.display = 'block';
}

ImageBox.prototype.mouseOutHandler = function() {
	/*for (var i = 0; i < this.insets.length; i++) {
		this.insets[i].style.backgroundImage = "none";
		this.insetContainers[i].style.color = 'white';
	}*/
	this.insetBox.style.display = 'none';
}

ImageBox.prototype.mouseMoveHandler = function(event) {
	var rect = this.display.getBoundingClientRect();
	var xCoord = Math.floor((event.clientX - rect.left)*this.display.naturalWidth /this.display.width );
	var yCoord = Math.floor((event.clientY - rect.top )*this.display.naturalHeight/this.display.height);
	
	for (var i = 0; i < this.insets.length; i++) {
		var xScroll = this.insets[i].clientWidth /2 - xCoord*this.insetZoom;
		var yScroll = this.insets[i].clientHeight/2 - yCoord*this.insetZoom;
		this.insets[i].style.backgroundPosition = xScroll + "px " + yScroll + "px";
	}
}