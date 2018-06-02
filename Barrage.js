/** Barrage Related
		1. Barrage
		* Assumptions:
			Fixed Font Size:15;
			Limited Length: 1~32;
			Fixed Life time: 3000 ms;
		* Structures:
			Content: text of Barrage
			TimeStart: When it appears
			Location:
				For now, only implement one type: Scrolling from Right to Left.
					fixed x, random y
			Animate:
				For now: From Right to Left.
			JSON keys: lower case
		* Conclusion
			{
				content: 
				timestart:
				duration: constant - 3000
				animation: constant string - 'toleft'
			}
		*** Rework Focus on a pool of Barrages.
			Any single Barrage bullet will be represented by a single json shown as above.
*/
class Base{
	static isnull(obj){
		return obj===null || typeof obj ==='undefined';
	}
}

/**
	Storage of Barrages.
	Also serves as the controller.
*/
class BarragePool{
	static getInstance(){
		return BarragePool.singleton;
	}
	constructor(videoScreen,video){
		//this.content = content;
		// video[0].currentTime 
		this.max = 100; //Percentage
		this.isHide = false;
		this.media = video;
		this.vid = videoScreen;
		this.pool = [];
		this.newCandidate = [];
		this.media.data('ancestor',this);
		this.paused=true;
		this.media.on("pause",function(){			
			$(this).data('ancestor').paused = true;
		});
		this.media.on("play",function(){
			
			$(this).data('ancestor').paused = false;
		});		
		this.media.on("seeked",function(){
			
			$.each($(this).data('ancestor').pool,function(key,bullet){
				if(Base.isnull(key)||Base.isnull(bullet)){
					//Equivalent to continue in a common loop
					return true;
				}
				bullet.node.clearQueue();
				bullet.node.stop();
				if(bullet.alive){
					bullet.hide();
					bullet.alive = false;
				}
			});
		});				
		//Ensure the fill property
		this.vid.css('object-fit: fill');
		this.media.css('object-fit: fill');
		BarragePool.singleton = this;
		setInterval(BarragePool.barrageControl, 30);
		
	}
static barrageControl(){
				let bController = BarragePool.singleton;
				if(bController.isHide){
					return;
				}
				let currTimeMilisec = bController.getCurrentTime()*1000; //Milisec
				if(bController.paused){
					//Pause All Barrage
					$.each(bController.pool,function(key,bullet){
						if(!(Base.isnull(key)||Base.isnull(bullet))){
							bullet.pauseBullet();
							//bullet.pauseBulletLegacy();
						}								
					});					
				}else{
				//If the video is not paused;
					let currentCount = 0;				
					$.each(bController.pool,function(key,bullet){
						currentCount++;
							if(!(Base.isnull(key)||Base.isnull(bullet))){
								bullet.resume();
								/**
									Condition to play: alive:false, timeStart approaching, Let`s say 
										 0<curr - timeStart<100
								*/
								var timeDiff = currTimeMilisec - bullet.timeStart;
								if(currentCount<= bController.max/100.0*bController.pool.length &&timeDiff>=0 && timeDiff<=300){ 
									//show() is invoked implicitely. alive is also set to true.
									bullet.play();										
								}
								if(!bullet.paused && bullet.alive){											
									switch(bullet.animation){
										case "toleft":										
											let nextPos = parseFloat(bullet.node.css('left')) - bullet.motionConfig.speed;
											
											bullet.node.css('left',nextPos);
											break;
										default:
											break;
									}
								}
							}
					});
				}					
		}	
	
	
/**
* Structural Info:
	content:
	timeStart:
	height:
	duration:
	animation:option
* Length limit: 100;	
*/	
	static verifyBullet(json){
		if(Base.isnull(json)||Base.isnull(json.content)||Base.isnull(json.timeStart)||!$.isNumeric(json.timeStart)){
			//Mandatory values
			//Animation is manually set as toleft: only if I have time.
			return false;
		}	
	
		return json.content.length<=100 && json.content.length>=0;
	}
	outOfBoundY(height){
		return height<0.15*this.vid.height()||height>0.80*this.vid.height();
	}
	loadJacketByArray(jArr){
		for(var key in jArr){
			if(!Base.isnull(key)){
				this.loadBullet(jArr[key]);
			}
		}
	}
	loadJacketByObj(jNest){
		let currentPool = this;
		$.each(jNest,function(key,bullet){
			if(!Base.isnull(bullet)){
				currentPool.loadBullet(bullet);
			}
		});
	}	
	loadBullet(json){
		
		if(!BarragePool.verifyBullet(json)){
			return;
		}
		
		var height,duration;
		if(!$.isNumeric(json.duration)||json.duration<=0){
			duration = 5000;
		}else{
			duration = json.duration;
		}
		if(!$.isNumeric(json.height)||this.outOfBoundY(json.duration)){
			height = this.rollHeight();
		}else{
			height = json.height;
		}	
		//constructor(pool,content,timeStart,height,duration = 3000, animation = 'toleft' )
		//Use show() or play() first.
		var bullet = new Bullet(this,json.content,json.timeStart,height,duration);
		this.pool.push(bullet);
		
	}
	loadBulletByInstance(bullet){
		this.pool.push(bullet);
	}
	getCurrentTime(){		
		return this.media[0].currentTime;
	}
	startLoc(){
		return 	this.vid.width();
	}
	rollHeight(){
		return Math.random()*0.80*this.vid.height()+0.15*this.vid.height();
	}
	
}
class Bullet{
	/**
		Make sure the style is:
			1: inline-block
			2: No width (or set to auto)
			3: min-width Defined
			
	*/
	constructor(pool,content,timeStart,height,duration = 5000, animation = 'toleft' ){
		this.wareHouse = pool; 
		this.content = content;
		this.timeStart = timeStart;
		if(Base.isnull(duration)|| duration<=0 || duration>30000){
			duration  = 5000;
		}
		this.duration = duration;
		//Not used
		this.animation = animation;
		

		this.node = $('<div></div>');
		this.node.addClass('bullet');		//just as a guarantee
		this.node.text(content);
		if(Base.isnull(height)||this.wareHouse.outOfBoundY(height)){
			height = this.wareHouse.rollHeight();
		}
		this.height = height;
		this.node.css("left",String(this.getStartLoc())+'px');
		this.node.css("top",this.height);
		this.node.data('ancestor',this);
		this.alive = false;
		switch(this.animation){
			case 'toleft':
			//interval 30ms
				//duration is in ms
				let speed = this.getRestLength()/(this.duration*1.0)*30.0;
				this.motionConfig = {speed:speed};
				break;
			default:
				this.motionConfig = {speed:0};
				break;
		}		
	}
	getStartLoc(){
	
		return this.getScreen().width()//-1.2*this.node.width();
	}
	getScreen(){
		return this.wareHouse.vid;
	}
	setIndex(i){
		this.index = i;
	}
	hide(){
		
		this.node.css('zIndex:-9');
		this.node.hide();
		//Display none might affect the animation part. 
	}
	show(){
		//WHen instantiated, the height/width of the video block might not be ready.
	// Moved to reset()//	this.node.css('left',this.getStartLoc()+'px');
		this.node.css('display','inline-block');
		this.node.appendTo(this.wareHouse.vid);
		this.node.css('zIndex:5');
	}
	getCurrentX(){
		return parseFloat(this.node.css('left'));
	}
	getRestLength(){
		//Assume the offset is 0
		return this.getCurrentX()+this.node.outerWidth();
	}
	getRestDuration(){
		return this.duration - this.timedLifeElapsed;
	}
	/**
		play() will reset
		use resume() to unpause.
	*/
	startAnimation(callback){
			
			this.node.animate({left:"-="+this.getRestLength()+"px"},this.getRestDuration(),'linear',function(e){
			$(this).data('ancestor').hide();
			if(!Base.isnull(callback)){
				callback($(this));
			}
			$(this).data('ancestor').alive = false;
			$(this).clearQueue();
		});		
	}
	play(callback){
		// Show the comment.
		this.reset();
		this.show();
		this.alive = true;
		
		//  Legacy: jquery animation
		//this.timedLifeStart = Date.now();
		//this.timedLifeElapsed = 0;
		
		//Put the motion into method: barrageControl
		//this.startAnimation();		

		
	}
	pauseBullet(){
		if(!this.alive){
			return;
		}
		this.pause =true;		
	}
	
	pauseBulletLegacy(){
		if(!this.alive){
			return;
		}
		this.pause =true;
		this.timedLifeElapsed = Date.now()-this.timedLifeStart;
		//Pause Animation
		this.node.clearQueue();
		//Stop Animation
		this.node.stop();				
	}	
	
	//resume the motion
	resume(){
		if(!this.alive){
			return;
		}
		this.pause = false;
		//this.startAnimation();
	}
	
	reset(){	
		//alert(this.getStartLoc()+" "+this.getScreen().width()+" "+this.node.width
		//Must append it to the div first. Otherwise the width is 0.
		this.node.appendTo(this.wareHouse.vid);
		this.node.css('left',this.getStartLoc()+'px');
	}
}
class bGenerator{
	//Readfrom firebase
	static setFirebase(fb){
		bGenerator.firebase = fb;
	}
	static setWarehouse(bPool){
		bGenerator.wareHouse = bPool;
	}
	static initGenerator(fb,bPool){
		bGenerator.setFirebase(fb);
		bGenerator.setWarehouse(bPool);
	}
	//LoadBullet then storageBarrage
	/**
		There are two promising approaches:
			(1) Post to the server - generate a key based on time+userName+crypto
			(2) Use push.
		The number (2) is more stable, as the key is handled by firebase itself and is ensured to be unique.
	*/
	static storeBarrage(bPool,videoId,content,timeStart,height,duration=5000,animation = 'toleft',callback = null){
		try{	
		
			let jsonBarrage = {
				 content:content,
				 timeStart:timeStart,
				 height:height,
				 duration:duration,
				 animation:animation,
			};
			
			
			bGenerator.firebase.database().ref('/videos/' + videoId+'/barrage/').push(jsonBarrage,function(error){
				if(error){
					alert("Please Login");
				}else{
					
					//bPool.loadBullet(jsonBarrage);
					if(callback!==null && typeof callback=='function'){
						callback(jsonBarrage);
					}
				}
				
			});
			
			// bGenerator.firebase.database().ref('/videos/' + videoId+'/barrage/').set();
		}
		catch(err){
			console.log(err.message);
		}
	}
	static fetchBarrage(videoDbId,bPool){
		//var userId = firebase.auth().currentUser.uid; 
		let currentPool = bPool;
		return bGenerator.firebase.database().ref('/videos/' + videoDbId+'/barrage/').once('value').then(function(snapshot) {
		  let barrageList = (snapshot && snapshot.val()); //If not null then get value. 
		  /**
			barrageList is a nested json. The key of the first level is meaningless
		  */
			currentPool.loadJacketByObj(barrageList);
		});
	}
	
	//On update
	//https://stackoverflow.com/questions/24891472/how-not-to-trigger-event-child-added-for-initial-children
	static registerBarrageOnUpdate(videoDbId){
		var ref = bGenerator.firebase.database().ref('/videos/' + videoDbId + '/barrage/');
		ref.on('child_added', function(snapshot) {
			var bullets = snapshot && snapshot.val();
		  
		  BarragePool.getInstance().loadBullet(bullets)
		});		
	}
	
	static initAll(videoDbId,source = null,parId = "video-container",vidId = "videoElement",inputId = "barrageIn" ,prepFlag = false){
		let domPak = bGenerator.renderVideoFrame(source,parId,vidId,inputId,prepFlag);
		//Generate Pool. Use the video container as the screen for barrage
			//BarragePool.singleton is initialized implicitly.
			
		let vidDom = $('#'+vidId);
		let parentDom = $('#'+parId);
		let bPool = new BarragePool(parentDom,vidDom);
		bGenerator.initGenerator(firebase,bPool);
		// bGenerator.fetchBarrage(videoDbId,bPool);
		domPak.input.on('keypress',function(event){
			//Press Enter to send the comment
			if(event.which!==13){
				return;
			}
			//send
			let content = $(this).val();
			let timeStart = bPool.getCurrentTime()*1000; //milisec
			let height = bPool.rollHeight();
			
			bGenerator.storeBarrage(bPool,videoDbId,content,timeStart,height);
			$(this).val('');
			//duration=5000,animation = 'toleft'
		});
		domPak.btnSend.on('click',function(event){
			let content = domPak.input.val();
			let timeStart = bPool.getCurrentTime()*1000; //milisec
			let height = bPool.rollHeight();
			
			bGenerator.storeBarrage(bPool,videoDbId,content,timeStart,height);
			domPak.input.val('');
			//duration=5000,animation = 'toleft'
		});		
		domPak.btnSwitch.on('click',function(event){
			bPool.isHide = !bPool.isHide;
			var label = "Barrage:"+(bPool.isHide?"off":"on");
			$(this).html(label);
			//duration=5000,animation = 'toleft'
		});				
		//labelDom
		domPak.range.on('change',function(event){
			bPool.max = $(this).val();
			domPak.label.text("Ratio of Count: "+$(this).val()+'%');
			//duration=5000,animation = 'toleft'
		});		
		bGenerator.registerBarrageOnUpdate(videoDbId);
	}
	static reFetch(videoDbId){
		fetchBarrage(videoDbId,BarragePool.singleton);
	}
	static renderVideoFrame(source = null,parId = "video-container",vidId = "videoElement",inputId = "barrageIn" ,prepFlag = false){
		if(parId==null || parId ===''|| vidId==null||vidId==''||inputId==null||inputId===''){
			
			return;
		}
		var divParent = $('<div id = "'+parId+'"> </div>');
		if(prepFlag){
			divParent.prepend("body");
		}else{
			divParent.appendTo("body");
		}
		//appendTo divParent
		var dummyFrame = $('<div></div>');
		dummyFrame.css('margin',"0 0 0 0");
		dummyFrame.css('padding',"0");
		dummyFrame.attr('id','dummy-container');
		dummyFrame.appendTo(divParent);
		var vidDom = $('<video id = "'+vidId+'" controls></video>');
		vidDom.appendTo(dummyFrame);
		vidDom.css('overflow: hidden');
		if(source!==null && typeof source !=='undefined'){
			var source = $('<source src = "'+source+'" >');
			source.appendTo(vidDom);
		}
		var textDom = $('<input type = "text" id = "'+inputId+'">');
		textDom.addClass('barrangeInput w3-input');
		textDom.appendTo(dummyFrame);
		textDom.attr('placeholder','Type barrage bullets here');
		vidDom.on('click',function(){
			if($(this)[0].paused){
				$(this)[0].play();
			}else{
				$(this)[0].pause();
			}
			
		});
		var btnDom = $('<button type="button">Send</button>');
		btnDom.appendTo(dummyFrame);
		btnDom.attr('id','btn-send');
		btnDom.addClass('btnBarrage w3-button');
		
		var btnSwitch = $('<button type="button">Bullets:on</button>');
		btnSwitch.appendTo(dummyFrame);
		btnSwitch.attr('id','btn-switch');
		btnSwitch.addClass('btnBarrage w3-button');
		
		var limitDom = $('<input type="range">');
		limitDom.attr('id','range-limit');
		limitDom.appendTo(dummyFrame);
		limitDom.val(100);
		var labelDom = $('<span class = "rangeLabel">Ratio of Count: 100%</span>')
		labelDom.appendTo(dummyFrame);
		return {parent:divParent,dummy:dummyFrame,video:vidDom,input:textDom,btnSend:btnDom,btnSwitch:btnSwitch,range:limitDom,label:labelDom};
	}
}


//