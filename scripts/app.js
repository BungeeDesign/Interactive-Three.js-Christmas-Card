/* 

ChristmasCard.cloud

Contains the main Three.js setup for the card scene

@Author James Rogers

@Credits 
https://riptutorial.com/three-js/example/17088/object-picking---raycasting For the raycaster setup (Refactored by myself)

*/

// Globals
let devCamControl = false,
particleSystem, 
particleCount, 
particles, 
sphere, 
deerGlobal, 
foundRaindeer, 
spotLight,
cabinLight,
stats,
scene,
renderer,
composer,
camera,
cameraControls,
smokeSpheres = [];

// Create the three scene
scene = new THREE.Scene();

// Variable which is increase by Math.PI every seconds - used for snow velocity progrssion / currently not used
let velocityIncreace = Date.now() * Math.PI;

// Raycaster
let raycaster, mouse = { x : 0, y : 0 };

// Card message
let msgName; // Grab from URL Param

// So the THREE Loader can access the barfill globally
let loadingBarFill = document.querySelector('.loadingBarFill');
let loadingPercentage = document.querySelector('.loadingPercentage');

// Wait until the DOM has loaded then run the scene
window.addEventListener('load', () => {

    // Custom santa emoji cursor
    document.addEventListener('mousemove', cursor);

    // For user interaction so audio can play automaticlly 
    let playBtn = document.querySelector('.playBtn');
    let loader = document.querySelector('.loader');
    playBtn.addEventListener('click', () =>{

        // Hide play button
        playBtn.classList.add('playBtnOut');

        // Activate the loader
        loader.classList.add('loaderActive');

        loadScene();
    });
});

function loadScene() {

        // Loading manager
        let manager = new THREE.LoadingManager();
        manager.onProgress = function ( item, loaded, total ) {
                
            let percent = (loaded / total * 100);
            loadingPercentage.textContent = percent + '%';
            console.log(percent);
            loadingBarFill.style.width = `${percent*5}px`;

            if (percent == 100) {
                init();
                animate();
                showScene();
            }
        };

        // Load Scene
        let loader = new THREE.ObjectLoader(manager);

        loader.load(
            // resource URL
            "assets/scene/scene.json",
    
            // onLoad callback
            // Here the loaded data is assumed to be an object
            function (obj) {
                // Add the loaded object to the scene
                scene.add(obj);
                
                // Hide orginal smoke geo
                scene.getObjectByName('Null').scale.x = 0.00001; // Don't set to 0 due to Threejs Matrix Warning 
                scene.getObjectByName('Null').scale.y = 0.00001;
    
            },
            // scene Load
            function (xhr) {
                let loadingVal = parseFloat(xhr.loaded);
                console.log(xhr.loaded, xhr.total, loadingVal);
                loadingPercentage.innerHTML = loadingVal / 100 + '%';
                loadingBarFill.style.width = `${parseInt(xhr.loaded) / 25000}px`;
            },
            // onError callback
            function (err) {
                console.error('Object - Base Scene could not be loaded', err);
            }
        );
}

function init() {

    // Event Listeners
    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('mousemove', objectClicked);
    
    // Audio
    let sceneAudio = {
        scene : new Howl({
            src: ['../assets/audio/scene.mp3'],
            loop: true,
            volume: 0.5
        }),
        snow : new Howl({
            src: ['../assets/audio/snow.mp3'],
            loop: true,
            volume: 0.9
        })
    };

    for (let audioName in sceneAudio) {
        if(!sceneAudio.hasOwnProperty(audioName)) continue;
        sceneAudio[audioName].play();
    };

    // HoHoHo Audio
    let hohoho = new Howl({
        src: ['../assets/audio/hohoho.wav'],
        loop: false
    });

    // Raycaster
    raycaster = new THREE.Raycaster();

    // Renderer
    renderer = new THREE.WebGLRenderer({
        antialias: true, // For smoother result not pixelated
        alpha: true,
        shadowMapEnabled: true
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('container').appendChild(renderer.domElement);

    // Create a perspective camera
    camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(17.8, 5.9, -28); // Set the deafult position to view the base scene object
    camera.rotation.set(0, 9.3, 0); // Adjust the camera rotation

    // Add the camera to the scene
    scene.add(camera);

    // Enable camera controls for dev / look around scene
    // cameraControls = new THREE.TrackballControls(camera, renderer.domElement)

    // Lights
    spotLight = new THREE.SpotLight();
    spotLight.position.set( 0, 300, 0 );
    scene.add(spotLight)
    spotLight.intensity = 0;
    
    // Cabin Light
    cabinLight = new THREE.SpotLight(0xE83D35);
    cabinLight.position.set(-2.9, 3, -10);
    scene.add(cabinLight);
    cabinLight.intensity = 0;
    

    // Fog
    scene.fog = new THREE.FogExp2( 0x1E2630, 1.324 );

    // Fog gets less dense animates the scene in
    TweenMax.to(scene.fog, 4, {density: 0.024, ease: Power2.easeInOut});


    // Add extra objects via OBJ Loader
    let objLoader = new THREE.OBJLoader();

    // Deer
    let deerMaterial = new THREE.MeshPhongMaterial({
        color: 0x7D5420,
        shading: THREE.FlatShading
    });

    let dearMesh = new THREE.Mesh(deerGlobal, deerMaterial);

    objLoader.load(
        '../assets/scene/objects/deer.obj',
        function (deer) {

            deer.traverse(function(node) {
                if (node.isMesh) {
                    node.material = deerMaterial;
                }
            })

            scene.add(deer);
            deer.scale.x = .006;
            deer.scale.y = .006;
            deer.scale.z = .006;
            deer.position.x = 12.3;
            deer.position.z = 7;
            deer.rotation.y = 3;

            // Set global access to deer object
            deerGlobal = deer;
        },
        function (error) {
            console.log('Object - Deer could not be loaded', error);
        }
    );


    // Snow Animation
    let texLoader = new THREE.TextureLoader(); // Load the snow texture

    particleCount = 15000;
    let pMaterial = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 2,
      map: texLoader.load(
         '../assets/images/snowflake.png'
       ),
       blending: THREE.AdditiveBlending,
       depthTest: false,
       transparent: true
    });

    // Create new THREE Geo for the particle system
    particles = new THREE.Geometry;
    for (let i = 0; i < particleCount; i++) {
        let pX = Math.random()*500 - 250,
            pY = Math.random()*500 - 250,
            pZ = Math.random()*500 - 250,
            particle = new THREE.Vector3(pX, pY, pZ);
        particle.velocity = {};
        particle.velocity.y = 0;
        particles.vertices.push(particle);
    }
    particleSystem = new THREE.Points(particles, pMaterial);
    scene.add(particleSystem);
    particleSystem.position.z = -50;

    // Smoke Animation
    let material =  new THREE.MeshPhongMaterial( {
        color: 0xffffff,
        shading: THREE.FlatShading,
        // wireframe: true
    } );

    let geometry = new THREE.SphereGeometry( 0, 100, 100 );
    for( let i = 0; i < 50; i ++ ){
        smokeSpheres.push(new THREE.Mesh( geometry, material));
        scene.add(smokeSpheres[i]);
    }

    smokeSpheres.forEach( box => {
        box.position.x = 11.4;
        box.position.y = 6;
        box.position.z = 6.5;

        box.scale.x = 0.00001;
        box.scale.y = 0.00001;
        box.scale.z = 0.00001;

        let randomScale = Math.random(160, 170);

        TweenMax.to( box.scale, 3, {
            x: randomScale * 2,
            y: randomScale * 2,
            z: randomScale * 2,
            ease: Power2.easeInOut,
            repeat: -1,
            delay: .3
        });

        TweenMax.to( box.position, 3, {
            y: 18 + Math.random() / 0.01,
            ease: Power2.easeInOut,
            repeat: -1,
            delay: .9
        });
    });


    // Intersection / Hover Event
    function objectClicked(e) {
        mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1;
        mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;

        //2. set the picking ray from the camera position and mouse coordinates
        raycaster.setFromCamera( mouse, camera );    

        //3. compute intersections (note the 2nd parameter)
        let intersects = raycaster.intersectObjects( scene.children, true );

        for ( let i = 0; i < intersects.length; i++ ) {
            let intersection = intersects[ i ],
            obj = intersection.object;
            // console.log("Intersected object", obj);

            if(obj.name == "Ground") {
                TweenMax.to(spotLight, 6, {intensity: 1});
            }

            if (obj.name == "Cabin_Door") {

                // Deer found
                foundRaindeer = true;

                // Cabin animation sequence
                TweenMax.to(obj.rotation, 1, {y: 1.9});

                // Increace cabin light intensity
                TweenMax.to(cabinLight, 1, {intensity: 1.9});

                // Deer constant movement
                TweenMax.to(deerGlobal.rotation, 1, {x: 0.09, ease: Power2.easeInOut, yoyo:true, repeat: -1});

                // Deer travel movement - TweenMax timeline
                let deerTravel = new TimelineMax({});
                deerTravel.to(deerGlobal.position, 1, {z: 2, delay: 1.2});
                deerTravel.to(deerGlobal.rotation, 1, {y: 2, delay: 1.5});
                deerTravel.to(deerGlobal.position, 24, {x: 22, delay: 2.5});
            }
        }

        // Step 2: Detect normal objects
        // 1. sets the mouse position with a coordinate system where the center
        //   of the screen is the origin
        mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1;
        mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;

        //2. set the picking ray from the camera position and mouse coordinates
        raycaster.setFromCamera( mouse, camera );    

        //3. compute intersections (no 2nd parameter true anymore)
        let intersectsFalse = raycaster.intersectObjects( scene.children );

        for ( let i = 0; i < intersectsFalse.length; i++ ) {
            let intersection = intersectsFalse[ i ],
            obj = intersection.object;
            // console.log("Intersected object", obj);
        }
        exitScene();
    }

    // Text
    // Call our get name function this will return our name form the message
    name = getName();

    let fontLoader = new THREE.FontLoader();

    fontLoader.load( '../assets/scene/medusafont.js', function ( font ) {

        let textGeo = new THREE.TextGeometry( `Merry Christmas, ${name}`, {

            font: font,

            size: 2,
            height: .3,
            curveSegments: 24,

            bevelThickness: .2,
            bevelSize: .2,
            bevelEnabled: true

        } );

        let textMaterial = new THREE.MeshPhongMaterial( { color: 0xD73C6F } );

        let textMesh = new THREE.Mesh( textGeo, textMaterial );
        textMesh.position.set(-20, 9, 12);
        textMesh.rotation.set(-0.08, 2.8, 0);

        scene.add(textMesh);
        
        // Text animation
        setTimeout(() => {
            hohoho.play(); // Play audio when text is animating
        }, 10200);

        TweenMax.to(textMesh.position, 26, {x: 60, ease: Power2.easeInOut, delay: 4});
    });
}

// Show scene

function showScene() {
    let preloader = document.querySelector('.preloader');
    preloader.classList.add('preloaderOut');
}

// Get Name via URL Param
function getName() {
    let urlParams = new URLSearchParams(window.location.search);
    let name = urlParams.get('name');
    return name;
}

// Exit Scene
function exitScene() {
    // Scene end animate camera out only if the raindeer and cabin door has been discoverd
    if (foundRaindeer == true) {
        console.log('Now true', foundRaindeer);
        setTimeout(() => {
            TweenMax.to(camera.position, 9, {z: 100, ease: Power2.easeInOut});
        }, 17000);
    
        // Run end scene
        setTimeout(() => {
            sceneEnd();
        }, 23000);
    }
}

// Curosr Control
function cursor(e) {
    let cursor = document.querySelector('.cursor');

    cursor.style.left = e.pageX + 'px';
    cursor.style.top = e.pageY + 'px';

}


// Window resize
function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}


// render the scene
function animate() {
    // update camera controls
    // cameraControls.update();

    // Dev Cam Control
    if (devCamControl == true) {
        document.querySelector('.devCamControl').style = 'display: block';
        //Position
        let xSlider = document.querySelector('.ccX').value;
        let ySlider = document.querySelector('.ccY').value;
        let zSlider = document.querySelector('.ccZ').value;

        let pxval = document.querySelector('.pxval');
        let pyval = document.querySelector('.pyval');
        let pzval = document.querySelector('.pzval');
        pxval.textContent = xSlider;
        pyval.textContent = ySlider;
        pzval.textContent = zSlider;

        // Roation
        let rtYSlider = document.querySelector('.rtY').value;

        let ryval = document.querySelector('.ryval');
        ryval.textContent = rtYSlider;

        // Set values to camera
        camera.position.set(xSlider, ySlider, zSlider);
        camera.rotation.set(0, rtYSlider, 0);

    }
    

    // Snow animation
    particleSystem.rotation.x += 0.001;
    requestAnimationFrame(animate);


    // actually render the scene
    renderer.render(scene, camera);
}


function sceneEnd() {
    let sendCard = document.querySelector('.endSceneContainer');
    sendCard.classList.add('endSceneActive');
}

