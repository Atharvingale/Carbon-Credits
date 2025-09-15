import React from 'react';
import { 
  Box, Button, Container, Grid, Typography, Stack, Divider, Card, CardMedia, CardContent, Chip, IconButton
} from '@mui/material';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import ShareIcon from '@mui/icons-material/Share';
import FavoriteIcon from '@mui/icons-material/Favorite';

const Blog = () => {
  const mainArticle = {
    category: "Climate Science",
    title: "The Future of Blue Carbon: How Ocean Ecosystems Are Leading Climate Action",
    subtitle: "Discover how mangroves, seagrass beds, and salt marshes are becoming powerful tools in the fight against climate change through innovative carbon sequestration technologies.",
    author: "Dr. Sarah Ocean",
    date: "March 15, 2024",
    readTime: "5 min read",
    image: "https://trustedcarbon.org/wp-content/uploads/2025/01/2-1.webp",
    likes: 124,
    shares: 38
  };

  const relatedArticles = [
    {
      category: "Case Study",
      title: "Community-Led Conservation: Success Stories from Costa Rica",
      subtitle: "Learn how local communities are driving blue carbon projects that benefit both the environment and local economies through sustainable practices.",
      author: "Elena Costal",
      date: "March 10, 2024",
      readTime: "7 min read",
      image: "https://trustedcarbon.org/wp-content/uploads/2025/01/2-1.webp",
      likes: 87,
      featured: true
    },
    {
      category: "Technology",
      title: "Understanding Carbon Credit Verification: What Buyers Need to Know",
      subtitle: "A comprehensive guide to carbon credit standards, verification processes, and how to ensure your purchases make a real impact.",
      author: "Marcus Rivera",
      date: "March 5, 2024",
      readTime: "6 min read",
      image: "https://trustedcarbon.org/wp-content/uploads/2025/01/2-1.webp",
      likes: 156,
      featured: false
    },
    {
      category: "Research",
      title: "Seagrass Restoration: The Hidden Carbon Champions of Our Oceans",
      subtitle: "Explore the incredible carbon sequestration potential of seagrass ecosystems and ongoing restoration efforts worldwide.",
      author: "Dr. James Current",
      date: "February 28, 2024",
      readTime: "4 min read",
      image: "https://trustedcarbon.org/wp-content/uploads/2025/01/2-1.webp",
      likes: 203,
      featured: true
    }
  ];

  const getCategoryColor = (category) => {
    const colors = {
      "Climate Science": "#2a9d8f",
      "Case Study": "#264653",
      "Technology": "#287271",
      "Research": "#0e766e"
    };
    return colors[category] || "#6c757d";
  };

  return (
    <Box>
      {/* Hero Section */}
      <Box 
        sx={{ 
          background: 'linear-gradient(135deg, rgba(124, 136, 135, 0.9) 0%, rgba(42, 157, 143, 0.85) 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '100vh'
        }}
      >
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            opacity: 0.4,
            backgroundImage: 'url(https://trustedcarbon.org/wp-content/uploads/2025/01/2-1.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 0,
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(180deg, rgba(14, 118, 110, 0.7) 0%, rgba(42, 157, 143, 0.5) 100%)',
              zIndex: 1
            }
          }} 
        />
        
        {/* Navbar */}
        <Box sx={{ position: 'relative', zIndex: 2 }}>
          <Navbar />
        </Box>
        
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2, pt: 12, pb: 12 }}>
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography 
              variant="h1" 
              sx={{ 
                fontSize: { xs: '2.5rem', md: '4rem' }, 
                fontWeight: 800, 
                mb: 2,
                background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.9) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              Insights & Stories
            </Typography>
            <Typography 
              variant="h4" 
              sx={{ 
                fontSize: { xs: '1.25rem', md: '1.5rem' },
                fontWeight: 400,
                mb: 3,
                opacity: 0.95
              }}
            >
              Exploring the Future of Blue Carbon
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                mb: 6, 
                maxWidth: '700px', 
                mx: 'auto',
                fontSize: { xs: '1rem', md: '1.1rem' },
                lineHeight: 1.7,
                opacity: 0.9
              }}
            >
              Stay updated with the latest research, case studies, and insights from our community. 
              Discover how ocean ecosystems are revolutionizing climate action and carbon markets.
            </Typography>
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={3} 
              justifyContent="center"
              sx={{ mb: 4 }}
            >
              <Button 
                variant="contained"
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  px: 4,
                  py: 1.5,
                  borderRadius: 3,
                  textTransform: 'none',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                Subscribe to Newsletter
              </Button>
              <Button 
                variant="outlined"
                sx={{
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  color: 'white',
                  px: 4,
                  py: 1.5,
                  borderRadius: 3,
                  textTransform: 'none',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                View All Articles
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* Articles Section */}
      <Box sx={{ py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          {/* Section Header */}
          <Box sx={{ 
            textAlign: 'center', 
            mb: { xs: 6, md: 8 },
            px: { xs: 2, md: 0 }
          }}>
            <Typography variant="h2" sx={{ 
              fontSize: { xs: '2rem', md: '2.5rem' }, 
              fontWeight: 700, 
              mb: 3, 
              color: '#264653',
              lineHeight: 1.3
            }}>
              Featured Article
            </Typography>
            <Typography variant="h6" sx={{ 
              color: '#6c757d', 
              maxWidth: '500px', 
              mx: 'auto',
              lineHeight: 1.6,
              fontSize: { xs: '1rem', md: '1.1rem' }
            }}>
              Discover the most impactful stories shaping the future of carbon markets
            </Typography>
          </Box>

          {/* Featured Article */}
          <Box sx={{ mb: { xs: 8, md: 12 } }}>
            <Card sx={{
              borderRadius: 4,
              overflow: 'hidden',
              backgroundColor: 'white',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                transform: 'translateY(-6px)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.12)'
              }
            }}>
              <Grid container sx={{ minHeight: { md: 500 } }}>
                <Grid item xs={12} md={6}>
                  <CardMedia
                    component="div"
                    sx={{
                      height: { xs: 300, md: '100%' },
                      minHeight: { md: 500 },
                      position: 'relative',
                      background: 'linear-gradient(135deg, rgba(14, 118, 110, 0.8) 0%, rgba(42, 157, 143, 0.7) 100%)',
                      backgroundImage: `url(${mainArticle.image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundBlendMode: 'overlay'
                    }}
                  >
                    <Box sx={{ position: 'absolute', top: 24, left: 24 }}>
                      <Chip 
                        label={mainArticle.category}
                        sx={{ 
                          backgroundColor: getCategoryColor(mainArticle.category),
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          px: 2,
                          py: 1
                        }}
                      />
                    </Box>
                  </CardMedia>
                </Grid>
                <Grid item xs={12} md={6}>
                  <CardContent sx={{ 
                    p: { xs: 4, md: 6 }, 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}>
                    <Typography variant="h3" sx={{ 
                      fontSize: { xs: '1.75rem', md: '2.25rem' }, 
                      fontWeight: 700, 
                      mb: 3, 
                      color: '#264653',
                      lineHeight: 1.3 
                    }}>
                      {mainArticle.title}
                    </Typography>
                    <Typography variant="body1" sx={{ 
                      mb: 4, 
                      color: '#6c757d', 
                      lineHeight: 1.7,
                      fontSize: { xs: '1rem', md: '1.1rem' }
                    }}>
                      {mainArticle.subtitle}
                    </Typography>
                    
                    <Stack 
                      direction={{ xs: 'column', sm: 'row' }} 
                      spacing={{ xs: 2, sm: 3 }} 
                      sx={{ 
                        mb: 4, 
                        alignItems: { xs: 'flex-start', sm: 'center' }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#6c757d' }}>
                        <PersonIcon sx={{ fontSize: 18 }} />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{mainArticle.author}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#6c757d' }}>
                        <CalendarTodayIcon sx={{ fontSize: 18 }} />
                        <Typography variant="body2">{mainArticle.date}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#6c757d' }}>
                        <AccessTimeIcon sx={{ fontSize: 18 }} />
                        <Typography variant="body2">{mainArticle.readTime}</Typography>
                      </Box>
                    </Stack>
                    
                    {/* Article engagement stats */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton size="small" sx={{ color: '#ff6b6b' }}>
                          <FavoriteIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="body2" sx={{ color: '#6c757d', fontSize: '0.9rem' }}>
                          {mainArticle.likes} likes
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconButton size="small" sx={{ color: '#2196f3' }}>
                          <ShareIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="body2" sx={{ color: '#6c757d', fontSize: '0.9rem' }}>
                          {mainArticle.shares} shares
                        </Typography>
                      </Box>
                      <IconButton size="small" sx={{ color: '#ffa726' }}>
                        <BookmarkBorderIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    
                    <Button 
                      variant="contained"
                      endIcon={<ArrowForwardIcon />}
                      sx={{
                        backgroundColor: '#2a9d8f',
                        borderRadius: 3,
                        px: 4,
                        py: 2,
                        textTransform: 'none',
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        alignSelf: 'flex-start',
                        boxShadow: '0 4px 16px rgba(42, 157, 143, 0.3)',
                        '&:hover': {
                          backgroundColor: '#238276',
                          boxShadow: '0 6px 20px rgba(42, 157, 143, 0.4)',
                          transform: 'translateY(-2px)'
                        }
                      }}
                    >
                      Read Full Article
                    </Button>
                  </CardContent>
                </Grid>
              </Grid>
            </Card>
          </Box>

          {/* Section Divider */}
          <Box sx={{ 
            textAlign: 'center', 
            mb: { xs: 6, md: 8 },
            px: { xs: 2, md: 0 }
          }}>
            <Typography variant="h4" sx={{ 
              fontSize: { xs: '1.75rem', md: '2.25rem' }, 
              fontWeight: 700, 
              mb: 3, 
              color: '#264653',
              lineHeight: 1.3
            }}>
              More Articles
            </Typography>
            <Divider sx={{ 
              width: 80, 
              height: 4, 
              backgroundColor: '#2a9d8f', 
              mx: 'auto', 
              borderRadius: 2,
              mb: 2
            }} />
            <Typography variant="body1" sx={{ 
              color: '#6c757d', 
              maxWidth: '500px', 
              mx: 'auto',
              lineHeight: 1.6,
              fontSize: { xs: '1rem', md: '1.1rem' }
            }}>
              Explore our latest insights, research, and success stories from the world of blue carbon
            </Typography>
          </Box>

          {/* Related Articles Grid */}
          <Grid 
            container 
            spacing={{ xs: 3, md: 4 }} 
            sx={{ 
              alignItems: 'stretch',
              justifyContent: 'center',
              maxWidth: '1200px',
              mx: 'auto'
            }}
          >
            {relatedArticles.map((article, index) => (
              <Grid item xs={12} sm={6} md={4} key={index} sx={{ display: 'flex' }}>
                <Card 
                  sx={{ 
                    width: '100%',
                    height: '600px', // Fixed exact height for all cards
                    maxWidth: '400px', // Fixed maximum width
                    borderRadius: 3,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease-in-out',
                    backgroundColor: 'white',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    margin: '0 auto', // Center the cards
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.15)'
                    }
                  }}
                >
                  <CardMedia
                    component="div"
                    sx={{
                      height: 200, // Fixed height for all images
                      minHeight: 200, // Ensure consistent minimum height
                      position: 'relative',
                      background: 'linear-gradient(135deg, rgba(14, 118, 110, 0.8) 0%, rgba(42, 157, 143, 0.7) 100%)',
                      backgroundImage: `url(${article.image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundBlendMode: 'overlay'
                    }}
                  >
                    <Box sx={{ position: 'absolute', top: 16, left: 16 }}>
                      <Chip 
                        label={article.category}
                        size="small"
                        sx={{ 
                          backgroundColor: getCategoryColor(article.category),
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.75rem'
                        }}
                      />
                    </Box>
                    {article.featured && (
                      <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
                        <Chip 
                          label="Featured"
                          size="small"
                          sx={{ 
                            backgroundColor: '#ffa726',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '0.75rem'
                          }}
                        />
                      </Box>
                    )}
                  </CardMedia>
                  
                  <CardContent sx={{ 
                    p: 3, // Fixed padding for consistency
                    flex: 1,
                    display: 'flex', 
                    flexDirection: 'column',
                    height: 'calc(100% - 200px)', // Account for fixed image height
                    justifyContent: 'space-between'
                  }}>
                    <Typography variant="h6" sx={{ 
                      fontWeight: 600, 
                      mb: 2, 
                      color: '#264653', 
                      lineHeight: 1.4,
                      fontSize: '1.2rem', // Fixed font size for consistency
                      height: '3.36em', // Fixed exact height (1.2rem * 1.4 line-height * 2 lines)
                      display: '-webkit-box',
                      WebkitLineClamp: 2, // Limit to 2 lines for consistency
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {article.title}
                    </Typography>
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2" sx={{ 
                        mb: 3, 
                        color: '#6c757d', 
                        lineHeight: 1.6, 
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        height: '4.8em', // Fixed exact height for 3 lines
                        fontSize: '0.9rem' // Fixed font size
                      }}>
                        {article.subtitle}
                      </Typography>
                      
                      {/* Fixed height section for metadata and actions */}
                      <Box sx={{ mt: 'auto' }}>
                        <Stack 
                          direction="row"
                          spacing={2} 
                          sx={{ 
                            mb: 2,
                            alignItems: 'center',
                            height: '24px' // Fixed height for metadata row
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#6c757d' }}>
                            <PersonIcon sx={{ fontSize: 14 }} />
                            <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                              {article.author.length > 12 ? `${article.author.substring(0, 12)}...` : article.author}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#6c757d' }}>
                            <CalendarTodayIcon sx={{ fontSize: 14 }} />
                            <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                              {article.date.split(' ')[0]} {article.date.split(' ')[1]}
                            </Typography>
                          </Box>
                        </Stack>
                        
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          mb: 2,
                          height: '24px' // Fixed height for stats row
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#6c757d' }}>
                            <AccessTimeIcon sx={{ fontSize: 14 }} />
                            <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>{article.readTime}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <FavoriteIcon sx={{ fontSize: 14, color: '#ff6b6b' }} />
                              <Typography variant="caption" sx={{ color: '#6c757d', fontSize: '0.75rem' }}>
                                {article.likes}
                              </Typography>
                            </Box>
                            <IconButton size="small" sx={{ color: '#ffa726', padding: 0.5 }}>
                              <BookmarkBorderIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Box>
                        </Box>
                        
                        <Button 
                          fullWidth
                          size="small" 
                          endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
                          sx={{ 
                            color: '#2a9d8f', 
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            py: 1.5,
                            height: '44px', // Fixed button height
                            borderRadius: 2,
                            border: '1px solid transparent',
                            '&:hover': { 
                              backgroundColor: 'rgba(42, 157, 143, 0.04)',
                              border: '1px solid rgba(42, 157, 143, 0.2)',
                              transform: 'translateY(-1px)'
                            },
                            transition: 'all 0.2s ease-in-out'
                          }}
                        >
                          Read Full Article
                        </Button>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
                </Grid>
              ))}
            </Grid>
        </Container>
      </Box>

      {/* Newsletter Subscription Section */}
      <Box sx={{ 
        backgroundColor: '#f8f9fa',
        py: { xs: 6, md: 8 }
      }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" sx={{ 
              fontSize: { xs: '1.75rem', md: '2.25rem' },
              fontWeight: 700,
              color: '#264653',
              mb: 3
            }}>
              Stay Updated with Blue Carbon Insights
            </Typography>
            <Typography variant="body1" sx={{ 
              color: '#6c757d',
              mb: 4,
              maxWidth: '500px',
              mx: 'auto',
              lineHeight: 1.6
            }}>
              Get the latest articles, research updates, and industry insights delivered 
              directly to your inbox. Join our community of climate action advocates.
            </Typography>
            
            <Stack 
              direction={{ xs: 'column', sm: 'row' }} 
              spacing={2} 
              sx={{ 
                maxWidth: '400px', 
                mx: 'auto',
                mb: 3
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Box 
                  component="input"
                  type="email"
                  placeholder="Enter your email address"
                  sx={{
                    width: '100%',
                    px: 3,
                    py: 2,
                    border: '2px solid #e9ecef',
                    borderRadius: 3,
                    fontSize: '1rem',
                    outline: 'none',
                    '&:focus': {
                      borderColor: '#2a9d8f'
                    }
                  }}
                />
              </Box>
              <Button
                variant="contained"
                sx={{
                  backgroundColor: '#2a9d8f',
                  px: 4,
                  py: 2,
                  borderRadius: 3,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                  boxShadow: '0 4px 16px rgba(42, 157, 143, 0.3)',
                  '&:hover': {
                    backgroundColor: '#238276',
                    boxShadow: '0 6px 20px rgba(42, 157, 143, 0.4)'
                  }
                }}
              >
                Subscribe
              </Button>
            </Stack>
            
            <Typography variant="caption" sx={{ 
              color: '#6c757d',
              fontSize: '0.875rem'
            }}>
              No spam, unsubscribe at any time. Privacy policy applies.
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default Blog;