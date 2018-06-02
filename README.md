# Barrage
 Barrage comments for video sites. So far, the backend is based on firebase.
### Content
* class Bullet: for comments
* class bGenerator: as the controller of the interaction to the backend
* class BarragePool: store all bullets and manage behaviors like motion/appearance/... 
### Example

###### Init:
* bGenerator.initAll([key of video in firebase], [the source address for <video>])

